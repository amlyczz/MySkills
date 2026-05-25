from playwright.async_api import async_playwright
from ...domain.repo_analyzer.interfaces import RepoScraper

class PlaywrightScraper(RepoScraper):
    
    async def scrape_repo(self, url: str, output_screenshot_path: str) -> str:
        """
        Visits the GitHub repo README, grabs raw text, and captures scrolling screenshot.
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url)
            
            readme_element = await page.query_selector('article')
            readme_text = ""
            if readme_element:
                readme_text = await readme_element.inner_text()
                
            await page.screenshot(path=output_screenshot_path, full_page=True)
            await browser.close()
            
        return readme_text[:5000]
