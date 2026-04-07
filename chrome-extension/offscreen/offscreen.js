// offscreen/offscreen.js
// Hosts the SmolVLM-500M-Instruct vision-language model via WebGPU.
// Receives ocrRequest messages from the service worker,
// runs inference, and returns the license plate text.

const MODEL_ID = 'HuggingFaceTB/SmolVLM-500M-Instruct';

let processor = null;
let model = null;
let loadPromise = null;
let inferencePromise = null; // serializes concurrent OCR requests

// ─── Message entry point ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'ocrRequest') return;
  runOcr(message.dataUrl)
    .then(text => sendResponse({ success: true, text }))
    .catch(err => sendResponse({ success: false, error: err.message }));
  return true; // async response
});

// ─── Model loading ────────────────────────────────────────────────────────────

async function _loadModel() {
  const { AutoProcessor, AutoModelForVision2Seq, env } = await import(
    chrome.runtime.getURL('lib/transformers.min.js')
  );

  // Point ORT JSEP WASM to the local lib/ directory.
  // The JSEP files (ort-wasm-simd-threaded.jsep.*) enable WebGPU acceleration.
  env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('lib/');

  // Processor: tokenizer + image processor config (~20 MB, fetched from HuggingFace).
  processor = await AutoProcessor.from_pretrained(MODEL_ID);

  // Model weights: q4f16 quantized via WebGPU (~400–600 MB one-time download,
  // cached permanently in browser Cache Storage after first run).
  model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
    dtype: 'q4f16',
    device: 'webgpu',
    progress_callback(p) {
      let text = null;
      if (p.status === 'progress') {
        const pct = Math.round(p.progress ?? 0);
        const file = (p.file ?? '').replace(/^.*\//, '');
        text = `Downloading model: ${file} — ${pct}%`;
      } else if (p.status === 'done') {
        text = 'Loading model into GPU memory…';
      }
      if (text) chrome.runtime.sendMessage({ action: 'ocrProgress', text }).catch(() => {});
    }
  });
}

function ensureModelLoaded() {
  if (!loadPromise) loadPromise = _loadModel();
  return loadPromise;
}

// ─── Inference ────────────────────────────────────────────────────────────────

async function runOcr(dataUrl) {
  // ONNX Runtime rejects concurrent generate() calls with "Session already started".
  // Chain requests so each waits for the previous to finish.
  const result = (inferencePromise = (inferencePromise ?? Promise.resolve()).then(
    () => _runOcrInner(dataUrl)
  ));
  return result;
}

async function _runOcrInner(dataUrl) {
  await ensureModelLoaded();

  const { RawImage } = await import(chrome.runtime.getURL('lib/transformers.min.js'));

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'image' },
        {
          type: 'text',
          text: 'What is the license plate number in this image? Reply with the digits only, no spaces or dashes.'
        }
      ]
    }
  ];

  const prompt = processor.apply_chat_template(messages, { add_generation_prompt: true });
  const image = await RawImage.fromURL(dataUrl);
  const inputs = await processor(prompt, [image]);

  const outputIds = await model.generate({
    ...inputs,
    max_new_tokens: 32,
    do_sample: false
  });

  // Slice off the prompt tokens — keep only newly generated tokens.
  const promptLen = inputs.input_ids.dims.at(-1);
  const newTokenIds = outputIds.slice(null, [promptLen, null]);
  const decoded = processor.batch_decode(newTokenIds, { skip_special_tokens: true });
  return decoded[0] ?? '';
}
