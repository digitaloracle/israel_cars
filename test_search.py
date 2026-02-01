import httpx
import sys

print('Testing data.gov.il API...', file=sys.stderr)

try:
    # Test 1: Search for car-related datasets
    print('\n1. Searching for car datasets...', file=sys.stderr)
    r = httpx.get('https://data.gov.il/api/3/action/package_search?q=car&rows=5', timeout=10)
    print(f'Status: {r.status_code}', file=sys.stderr)
    
    if r.status_code == 200:
        data = r.json()
        print(f'Success: {data.get("success")}', file=sys.stderr)
        if data.get('success'):
            results = data.get('result', {}).get('results', [])
            print(f'Found {len(results)} packages', file=sys.stderr)
            
            # Print package names
            for i, pkg in enumerate(results[:3], 1):
                title = pkg.get('title', pkg.get('name', 'Unknown'))
                print(f'  {i}. {title}', file=sys.stderr)
                
                # Show resources
                resources = pkg.get('resources', [])
                for res in resources[:2]:
                    res_name = res.get('name', 'unnamed')
                    res_id = res.get('id', 'no-id')
                    print(f'     Resource: {res_name} (ID: {res_id[:15]}...)', file=sys.stderr)
    
    # Test 2: Search for vehicle history
    print('\n2. Searching for vehicle history...', file=sys.stderr)
    r2 = httpx.get('https://data.gov.il/api/3/action/package_search?q=vehicle+history&rows=5', timeout=10)
    if r2.status_code == 200:
        data2 = r2.json()
        if data2.get('success'):
            results2 = data2.get('result', {}).get('results', [])
            print(f'Found {len(results2)} packages for vehicle history', file=sys.stderr)
            for pkg in results2[:3]:
                print(f'  - {pkg.get("title", pkg.get("name", "Unknown"))}', file=sys.stderr)
    
    # Test 3: List all packages
    print('\n3. Getting package list...', file=sys.stderr)
    r3 = httpx.get('https://data.gov.il/api/3/action/package_list', timeout=10)
    if r3.status_code == 200:
        data3 = r3.json()
        if data3.get('success'):
            packages = data3.get('result', [])
            print(f'Total packages in catalog: {len(packages)}', file=sys.stderr)
            # Find vehicle-related packages
            vehicle_packages = [p for p in packages if 'vehicle' in p.lower() or 'car' in p.lower() or 'רכב' in p]
            print(f'Vehicle-related packages: {len(vehicle_packages)}', file=sys.stderr)
            for vp in vehicle_packages[:5]:
                print(f'  - {vp}', file=sys.stderr)
    
    # Test 4: Search with Hebrew terms
    print('\n4. Searching with Hebrew terms...', file=sys.stderr)
    hebrew_terms = ['רכב פרטי', 'רכב מסחרי', 'רכבים', 'vehicle private']
    for term in hebrew_terms:
        r = httpx.get('https://data.gov.il/api/3/action/package_search', 
                     params={'q': term, 'rows': 5}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('success'):
                count = data.get('result', {}).get('count', 0)
                print(f'  \"{term}\": {count} packages', file=sys.stderr)
    
    # Test 5: Look for the private-and-commercial-vehicles package details
    print('\n5. Getting current vehicle package details...', file=sys.stderr)
    r5 = httpx.get('https://data.gov.il/api/3/action/package_show?id=private-and-commercial-vehicles', timeout=10)
    if r5.status_code == 200:
        data5 = r5.json()
        if data5.get('success'):
            pkg = data5.get('result', {})
            print(f'Package: {pkg.get("title", pkg.get("name"))}', file=sys.stderr)
            print(f'Notes: {pkg.get("notes", "No description")[:200]}...', file=sys.stderr)
            resources = pkg.get('resources', [])
            print(f'Resources: {len(resources)}', file=sys.stderr)
            for res in resources:
                print(f'  - {res.get("name", "unnamed")} (ID: {res.get("id", "no-id")})', file=sys.stderr)
    
    # Test 6: Check the second resource (alternative dataset)
    print('\n6. Checking alternative vehicle resource...', file=sys.stderr)
    r6 = httpx.get('https://data.gov.il/api/3/action/datastore_search',
                   params={'resource_id': '0866573c-40cd-4ca8-91d2-9dd2d7a492e5', 'q': '11111111', 'limit': 1},
                   timeout=10)
    print(f'Second resource status: {r6.status_code}', file=sys.stderr)
    if r6.status_code == 200:
        data6 = r6.json()
        if data6.get('success'):
            records = data6.get('result', {}).get('records', [])
            print(f'Found {len(records)} records in second resource', file=sys.stderr)
            if records:
                print(f'Fields: {list(records[0].keys())}', file=sys.stderr)
    
    # Test 7: Search results for Hebrew terms
    print('\n7. Examining Hebrew search results...', file=sys.stderr)
    for term in ['רכב פרטי', 'רכבים']:
        r = httpx.get('https://data.gov.il/api/3/action/package_search',
                     params={'q': term, 'rows': 3}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('success'):
                results = data.get('result', {}).get('results', [])
                print(f'\n  Results for "{term}":', file=sys.stderr)
                for pkg in results:
                    print(f'    - {pkg.get("title", pkg.get("name"))}', file=sys.stderr)
                    print(f'      ID: {pkg.get("name")}', file=sys.stderr)
    
    # Test 8: Check interesting packages for historical data
    print('\n8. Checking packages with potential historical data...', file=sys.stderr)
    interesting_packages = [
        'reshev_bitul_sofi',  # Vehicles removed from road
        'degem-rechev-wltp',  # Vehicle models
    ]
    
    for pkg_id in interesting_packages:
        print(f'\n  Package: {pkg_id}', file=sys.stderr)
        r = httpx.get(f'https://data.gov.il/api/3/action/package_show?id={pkg_id}', timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('success'):
                pkg = data.get('result', {})
                print(f'    Title: {pkg.get("title")}', file=sys.stderr)
                resources = pkg.get('resources', [])
                print(f'    Resources: {len(resources)}', file=sys.stderr)
                for res in resources[:2]:
                    print(f'      - {res.get("name")} ({res.get("id")})', file=sys.stderr)
    
    # Test 9: Search for ownership/transfer related terms
    print('\n9. Searching for ownership-related datasets...', file=sys.stderr)
    ownership_terms = ['transfer', 'baalut', 'בעלות', 'העברה', 'רישוי']
    for term in ownership_terms[:3]:
        r = httpx.get('https://data.gov.il/api/3/action/package_search',
                     params={'q': term, 'rows': 5}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('success'):
                count = data.get('result', {}).get('count', 0)
                if count > 0:
                    print(f'  \"{term}\": {count} packages', file=sys.stderr)
                    results = data.get('result', {}).get('results', [])
                    for pkg in results[:2]:
                        print(f'    - {pkg.get("title")}', file=sys.stderr)
    
    # Test 10: Check scrapped vehicles dataset for historical data
    print('\n10. Checking scrapped vehicles dataset...', file=sys.stderr)
    r = httpx.get('https://data.gov.il/api/3/action/datastore_search',
                  params={'resource_id': '851ecab1-0622-4dbe-a6c7-f950cf82abf9', 'limit': 1},
                  timeout=10)
    if r.status_code == 200:
        data = r.json()
        if data.get('success'):
            records = data.get('result', {}).get('records', [])
            if records:
                print(f'  Fields: {list(records[0].keys())}', file=sys.stderr)
                print(f'  Sample record: {records[0]}', file=sys.stderr)
    
    # Test 11: Search for private_vehicle_history
    print('\n11. Searching for private_vehicle_history...', file=sys.stderr)
    r = httpx.get('https://data.gov.il/api/3/action/package_search',
                  params={'q': 'private_vehicle_history', 'rows': 10}, timeout=10)
    if r.status_code == 200:
        data = r.json()
        if data.get('success'):
            results = data.get('result', {}).get('results', [])
            print(f'  Found {len(results)} packages', file=sys.stderr)
            for pkg in results:
                print(f'    - {pkg.get("name")}: {pkg.get("title")}', file=sys.stderr)
                resources = pkg.get('resources', [])
                for res in resources[:3]:
                    print(f'      Resource: {res.get("name")} (ID: {res.get("id")})', file=sys.stderr)
    
    # Test 12: Summary
    print('\n12. SUMMARY:', file=sys.stderr)
    print('  - Main vehicle resource: 053cea08-09bc-40ec-8f7a-156f0677aff3 (working)', file=sys.stderr)
    print('  - Secondary vehicle resource: 0866573c-40cd-4ca8-91d2-9dd2d7a492e5 (tire data)', file=sys.stderr)
    print('  - Scrapped vehicles dataset: Available but only shows end-of-life data', file=sys.stderr)
    print('  - NO ownership history dataset found via CKAN API', file=sys.stderr)
    print('  - Historical data only available via protected gov.il website', file=sys.stderr)

except Exception as e:
    print(f'Error: {type(e).__name__}: {e}', file=sys.stderr)
    import traceback
    traceback.print_exc()

print('\nDone!', file=sys.stderr)
