import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        page.on('console', lambda msg: print(f'CONSOLE: {msg.text}'))
        
        def handle_response(response):
            if 'api/documents/upload' in response.url:
                print(f'UPLOAD RESPONSE: {response.status} {response.status_text}')
        page.on('response', handle_response)
        
        print('Navigating to Vercel site...')
        await page.goto('https://nova-ai-sigma-pink.vercel.app/login')
        
        print('Logging in...')
        await page.fill('input[type="email"]', 'livedebug1@test.com')
        await page.fill('input[type="password"]', 'password')
        await page.click('button[type="submit"]')
        
        await page.wait_for_url('**/', timeout=15000)
        print('Logged in successfully, navigated to dashboard.')
        
        # Click Document Manager
        await page.click('text=Document Manager')
        
        # Create a test file
        with open('test_playwright.txt', 'w') as f:
            f.write('This is a test document for playwright upload.')
            
        # Upload it
        print('Uploading document...')
        async with page.expect_file_chooser() as fc_info:
            await page.click('text=Upload Document')
        file_chooser = await fc_info.value
        await file_chooser.set_files('test_playwright.txt')
        
        # Wait to see if upload finishes
        await page.wait_for_timeout(10000)
        
        print('Checking page content for success/failure...')
        content = await page.content()
        if 'Failed to upload' in content:
            print('RESULT: Failed to upload found on page!')
        elif 'test_playwright.txt' in content:
            print('RESULT: test_playwright.txt found on page!')
            
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
