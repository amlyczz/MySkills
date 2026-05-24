from langchain_core.tools import tool
from playwright.async_api import async_playwright

@tool
async def scrape_github_repo_tool(url: str, output_screenshot_path: str) -> dict:
    """
    Visits a GitHub repo, extracts the README text, and takes a full-page scrolling screenshot.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url)
        
        # Extract README text
        readme_element = await page.query_selector('article')
        readme_text = ""
        if readme_element:
            readme_text = await readme_element.inner_text()
            
        # Take full page screenshot
        await page.screenshot(path=output_screenshot_path, full_page=True)
        await browser.close()
        
    return {
        "readme": readme_text[:5000], # Limit length for context window
        "screenshot_path": output_screenshot_path
    }
