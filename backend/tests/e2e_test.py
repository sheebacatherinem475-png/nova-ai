
import httpx
import asyncio
import json

async def test_e2e():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print('1. Register and Login...')
        try:
            await client.post('http://localhost:8000/api/auth/register', json={'email': 'e2e@test.com', 'password': 'password'})
        except Exception:
            pass
            
        resp = await client.post('http://localhost:8000/api/auth/login', data={'username': 'e2e@test.com', 'password': 'password'})
        token = resp.json().get('access_token')
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test Documents
        for ext in ['txt', 'pdf', 'docx']:
            print(f'\n--- Testing Document Upload: {ext.upper()} ---')
            with open(f'test.{ext}', 'rb') as f:
                resp = await client.post('http://localhost:8000/api/documents/upload', headers=headers, files={'file': f})
                if resp.status_code != 200:
                    print(f'FAILED to upload {ext}: {resp.status_code} {resp.text}')
                    continue
                print(f'Upload {ext} successful!')
                
        # Ask question
        print('\n--- Testing Document RAG Chat ---')
        chat_req = {
            'message': 'What is the secret password, code, and color?',
            'history': []
        }
        async with client.stream('POST', 'http://localhost:8000/api/chat', headers=headers, json=chat_req) as response:
            answer = ''
            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    try:
                        data = json.loads(line[6:])
                        if 'chunk' in data:
                            answer += data['chunk']
                    except:
                        pass
            print(f'AI RAG Answer: {answer}')
            if 'ALBATROSS' in answer and 'BANANA' in answer and 'MAGENTA' in answer:
                print('Document processing and ChromaDB RAG SUCCESS!')
            else:
                print('FAILED: AI did not return the correct facts from the documents.')

        # Test Datasets
        dataset_ids = []
        for ext in ['csv', 'xlsx', 'json']:
            print(f'\n--- Testing Dataset Upload: {ext.upper()} ---')
            with open(f'test.{ext}', 'rb') as f:
                resp = await client.post('http://localhost:8000/api/datasets/upload', headers=headers, files={'file': f})
                if resp.status_code != 200:
                    print(f'FAILED to upload {ext}: {resp.status_code} {resp.text}')
                    continue
                ds_id = resp.json()['id']
                dataset_ids.append(ds_id)
                print(f'Upload {ext} successful! Pandas loaded successfully.')
                
        # Ask dataset question
        if dataset_ids:
            print('\n--- Testing Dataset Data Analysis Chat ---')
            chat_req = {
                'message': 'What is the average age?',
                'history': [],
                'dataset_id': dataset_ids[0]
            }
            async with client.stream('POST', 'http://localhost:8000/api/data-analysis/analyze', headers=headers, json=chat_req) as response:
                answer = ''
                async for line in response.aiter_lines():
                    if line.startswith('data: '):
                        try:
                            data = json.loads(line[6:])
                            if 'chunk' in data:
                                answer += data['chunk']
                        except:
                            pass
                print(f'AI Dataset Answer: {answer}')
                if '27.5' in answer:
                    print('Dataset Data Analysis SUCCESS!')
                else:
                    print('FAILED: AI did not return the correct average age (27.5).')
                    
asyncio.run(test_e2e())
