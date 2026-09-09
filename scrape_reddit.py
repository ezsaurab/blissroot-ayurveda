from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def scrape_reddit(url):
    print("Setting up Selenium WebDriver...")
    
    options = Options()
    # Uncomment the next line if you want the browser to run invisibly in the background
    # options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    # Initialize the Chrome driver (requires chromedriver installed and in PATH)
    driver = webdriver.Chrome(options=options)
    
    try:
        print(f"Navigating to {url}...")
        driver.get(url)
        
        # Wait until the main title (h1) is present
        title_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "h1"))
        )
        
        print("\n" + "="*50)
        print("POST TITLE:")
        print(title_element.text)
        print("="*50 + "\n")
        
        # Give the page a moment to load the comments (sometimes they load dynamically)
        time.sleep(3)
        
        # Reddit's newer web interface uses the <shreddit-comment> tag for comments
        print("Extracting comments...\n")
        comments = driver.find_elements(By.TAG_NAME, "shreddit-comment")
        
        if not comments:
            print("No comments found. The page structure might have changed or required more time to load.")
            return

        for i, comment in enumerate(comments):
            author = comment.get_attribute("author")
            score = comment.get_attribute("score")
            
            # The text inside comments is usually split into <p> tags
            paragraphs = comment.find_elements(By.TAG_NAME, "p")
            comment_text = "\n".join([p.text for p in paragraphs if p.text.strip()])
            
            if comment_text:
                print(f"--- Comment {i+1} | Author: u/{author} | Score: {score} ---")
                print(comment_text)
                print("-" * 50 + "\n")
                
    except Exception as e:
        print(f"An error occurred while scraping: {e}")
    finally:
        print("Closing the browser...")
        driver.quit()

if __name__ == "__main__":
    target_url = "https://www.reddit.com/r/explainlikeimfive/comments/1qa4tf4/eli5_how_does_it_verify_youre_human/"
    scrape_reddit(target_url)
