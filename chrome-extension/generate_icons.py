"""Generate PNG icons for Chrome extension from simple shapes."""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Create a simple icon with IL text on blue background."""
    # Create image with blue background
    img = Image.new('RGBA', (size, size), (0, 102, 204, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle effect (fill corners with transparency)
    radius = size // 5
    
    # Add car silhouette or text
    if size <= 16:
        # Small icon - just "IL" text
        font_size = size - 4
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        text = "IL"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - 1
        draw.text((x, y), text, fill='white', font=font)
    else:
        # Larger icons - draw simple car shape
        # Car body
        car_width = int(size * 0.7)
        car_height = int(size * 0.25)
        car_x = (size - car_width) // 2
        car_y = int(size * 0.35)
        
        # Body rectangle
        draw.rounded_rectangle(
            [car_x, car_y, car_x + car_width, car_y + car_height],
            radius=size // 15,
            fill='white'
        )
        
        # Roof
        roof_width = int(car_width * 0.5)
        roof_height = int(car_height * 0.8)
        roof_x = car_x + (car_width - roof_width) // 2
        roof_y = car_y - roof_height + 2
        draw.rounded_rectangle(
            [roof_x, roof_y, roof_x + roof_width, roof_y + roof_height],
            radius=size // 20,
            fill='white'
        )
        
        # Wheels
        wheel_radius = int(size * 0.08)
        wheel_y = car_y + car_height - wheel_radius // 2
        left_wheel_x = car_x + int(car_width * 0.2)
        right_wheel_x = car_x + int(car_width * 0.8)
        
        draw.ellipse(
            [left_wheel_x - wheel_radius, wheel_y - wheel_radius,
             left_wheel_x + wheel_radius, wheel_y + wheel_radius],
            fill='#333333'
        )
        draw.ellipse(
            [right_wheel_x - wheel_radius, wheel_y - wheel_radius,
             right_wheel_x + wheel_radius, wheel_y + wheel_radius],
            fill='#333333'
        )
        
        # License plate
        plate_width = int(size * 0.5)
        plate_height = int(size * 0.15)
        plate_x = (size - plate_width) // 2
        plate_y = int(size * 0.7)
        
        draw.rounded_rectangle(
            [plate_x, plate_y, plate_x + plate_width, plate_y + plate_height],
            radius=size // 30,
            fill='white',
            outline='#333333',
            width=max(1, size // 48)
        )
        
        # Text on plate
        try:
            font = ImageFont.truetype("arial.ttf", size // 8)
        except:
            font = ImageFont.load_default()
        
        text = "IL"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = plate_x + (plate_width - text_width) // 2
        text_y = plate_y + 1
        draw.text((text_x, text_y), text, fill='#0066cc', font=font)
    
    img.save(output_path, 'PNG')
    print(f"Created {output_path}")

if __name__ == '__main__':
    icons_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(icons_dir, 'icons')
    
    create_icon(16, os.path.join(icons_dir, 'icon16.png'))
    create_icon(48, os.path.join(icons_dir, 'icon48.png'))
    create_icon(128, os.path.join(icons_dir, 'icon128.png'))
    
    print("All icons generated!")
