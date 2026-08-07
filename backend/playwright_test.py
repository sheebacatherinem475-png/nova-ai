from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser error: {err}"))
    page.on("requestfailed", lambda request: print(f"Request failed: {request.url} - {request.failure.error_text}"))
    
    # 1. Login
    page.goto('http://localhost:3000/login')
    page.fill('input[type="email"]', 'e2e@test.com')
    page.fill('input[type="password"]', 'password')
    page.click('button[type="submit"]')
    page.wait_for_url('http://localhost:3000/', timeout=10000)
    print('Logged in!')
    
    browser.close()