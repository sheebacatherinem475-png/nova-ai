import urllib.request
try:
    content = urllib.request.urlopen('https://nova-ai-sigma-pink.vercel.app').read().decode('utf-8')
    import re
    chunks = re.findall(r'src=\"(/_next/static/chunks/[^\"]+)\"', content)
    
    found = False
    for chunk in chunks:
        url = 'https://nova-ai-sigma-pink.vercel.app' + chunk
        js = urllib.request.urlopen(url).read().decode('utf-8')
        if 'nova-ai-0m0x.onrender.com' in js:
            print(f'Found backend URL in {chunk}')
            found = True
        if '/api/documents/upload' in js:
            print(f'Found upload endpoint in {chunk}')
            
            # Check if it has Authorization header logic
            if 'Authorization' in js and 'Bearer' in js:
                print('Authorization header logic is present in the chunk!')
            else:
                print('WARNING: Authorization header logic is MISSING from the chunk!')
                
    if not found:
        print('Backend URL not found in any chunk!')
except Exception as e:
    print('Error:', e)
