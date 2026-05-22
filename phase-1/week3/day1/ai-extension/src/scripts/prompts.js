/**
 * Collection of default prompts for different use cases (ICE POT Format)
 */
export const DEFAULT_PROMPTS = {
 
  /**
   * Selenium Java Page Object Prompt (No Test Class)
   */
  SELENIUM_JAVA_PAGE_ONLY: `
    Instructions:
    - Generate ONLY a Selenium Java Page Object Class (no test code).
    - Add JavaDoc for methods & class.
    - Use Selenium 2.30+ compatible imports.
    - Use meaningful method names.
    - Do NOT include explanations or test code.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`java
    package com.testleaf.pages;

    /**
     * Page Object for Component Page
     */
    public class ComponentPage {
        // Add methods as per the DOM
    }
    \`\`\`

    Persona:
    - Audience: Automation engineer focusing on maintainable POM structure.

    Output Format:
    - A single Java class inside a \`\`\`java\`\`\` block.

    Tone:
    - Clean, maintainable, enterprise-ready.
  `,

  /**
   * Cucumber Feature File Only Prompt
   */
  CUCUMBER_ONLY: `
    Instructions:
    - Generate ONLY a Cucumber (.feature) file.
    - Use Scenario Outline with Examples table.
    - Make sure every step is relevant to the provided DOM.
    - Do not combine multiple actions into one step.
    - Use South India realistic dataset (names, addresses, pin codes, mobile numbers).
    - Use dropdown values only from provided DOM.
    - Generate multiple scenarios if applicable.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "testuser" | "testpass"|
      | "admin"    | "admin123"|
    \`\`\`

    Persona:
    - Audience: BDD testers who only need feature files.

    Output Format:
    - Only valid Gherkin in a \`\`\`gherkin\`\`\` block.

    Tone:
    - Clear, structured, executable.
  `,

  /**
   * Cucumber with Step Definitions
   */
  CUCUMBER_WITH_SELENIUM_JAVA_STEPS: `
    Instructions:
    - Generate BOTH:
      1. A Cucumber .feature file.
      2. A Java step definition class for selenium.
    - Do NOT include Page Object code.
    - Step defs must include WebDriver setup, explicit waits, and actual Selenium code.
    - Use Scenario Outline with Examples table (South India realistic data).

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to OpenTaps

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
\      | "admin"    | "admin123"|
    \`\`\`

    \`\`\`java
    package com.leaftaps.stepdefs;

    import io.cucumber.java.en.*;
    import org.openqa.selenium.*;
    import org.openqa.selenium.chrome.ChromeDriver;
    import org.openqa.selenium.support.ui.*;

    public class LoginStepDefinitions {
        private WebDriver driver;
        private WebDriverWait wait;

        @io.cucumber.java.Before
        public void setUp() {
            driver = new ChromeDriver();
            wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            driver.manage().window().maximize();
        }

        @io.cucumber.java.After
        public void tearDown() {
            if (driver != null) driver.quit();
        }

        @Given("I open the login page")
        public void openLoginPage() {
            driver.get("\${pageUrl}");
        }

        @When("I type {string} into the Username field")
        public void enterUsername(String username) {
            WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("username")));
            el.sendKeys(username);
        }

        @When("I type {string} into the Password field")
        public void enterPassword(String password) {
            WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("password")));
            el.sendKeys(password);
        }

        @When("I click the Login button")
        public void clickLogin() {
            driver.findElement(By.xpath("//button[contains(text(),'Login')]")).click();
        }

        @Then("I should be logged in successfully")
        public void verifyLogin() {
            WebElement success = wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("success")));
            assert success.isDisplayed();
        }
    }
    \`\`\`

    Persona:
    - Audience: QA engineers working with Cucumber & Selenium.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block + Java code in \`\`\`java\`\`\` block.

    Tone:
    - Professional, executable, structured.
  `,

  /**
   * Playwright TypeScript Page Object Prompt (No Test Class)
   */
  PLAYWRIGHT_TYPESCRIPT_PAGE_ONLY: `
    Instructions:
    - Generate ONLY a Playwright TypeScript Page Object Class (no test code).
    - Use Playwright best practices and selectors.
    - Add JSDoc comments for methods & class.
    - Use TypeScript interfaces for type safety.
    - Use meaningful method names and locator properties.
    - Import only necessary Playwright modules.
    - Do NOT include explanations or test code.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`typescript
    import { Page, Locator } from '@playwright/test';

    /**
     * Page Object for Component Page
     */
    export class ComponentPage {
      readonly page: Page;

      /**
       * Initialize the page object
       * @param page - Playwright Page object
       */
      constructor(page: Page) {
        this.page = page;
      }

      /**
       * Retrieve locator for element
       */
      get elementName(): Locator {
        return this.page.locator('selector');
      }

      /**
       * Method to perform action
       */
      async performAction(): Promise<void> {
        // Add implementation
      }
    }
    \`\`\`

    Persona:
    - Audience: Automation engineer focusing on Playwright TypeScript Page Object Model.

    Output Format:
    - A single TypeScript class inside a \`\`\`typescript\`\`\` block.

    Tone:
    - Clean, maintainable, modern, enterprise-ready.
  `,

  /**
   * Playwright TypeScript Page Object with Test File
   */
  PLAYWRIGHT_TYPESCRIPT_WITH_TESTS: `
    Instructions:
    - Generate BOTH:
      1. A Playwright TypeScript Page Object Class.
      2. A TypeScript test file using Playwright Test framework.
    - Use Playwright best practices and modern TypeScript patterns.
    - Add JSDoc comments for all methods.
    - Use TypeScript interfaces and types.
    - Include proper error handling and waits.
    - Tests should be concise and focused.
    - Do NOT include step definitions or feature files.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`typescript
    // page-object.ts
    import { Page, Locator } from '@playwright/test';

    /**
     * Page Object for Component Page
     */
    export class ComponentPage {
      readonly page: Page;

      constructor(page: Page) {
        this.page = page;
      }

      get header(): Locator {
        return this.page.locator('header');
      }

      async navigateTo(): Promise<void> {
        await this.page.goto('\${pageUrl}');
      }

      async verifyPageTitle(title: string): Promise<boolean> {
        return (await this.page.title()) === title;
      }
    }
    \`\`\`

    \`\`\`typescript
    // component.spec.ts
    import { test, expect } from '@playwright/test';
    import { ComponentPage } from './page-object';

    test.describe('Component Page Tests', () => {
      let page: ComponentPage;

      test.beforeEach(async ({ page: playwrightPage }) => {
        page = new ComponentPage(playwrightPage);
        await page.navigateTo();
      });

      test('should verify page loads successfully', async ({ page: playwrightPage }) => {
        const isValid = await page.verifyPageTitle('Expected Title');
        expect(isValid).toBeTruthy();
      });

      test('should display header', async ({ page: playwrightPage }) => {
        const header = page.header;
        await expect(header).toBeVisible();
      });
    });
    \`\`\`

    Persona:
    - Audience: QA engineers and developers using Playwright TypeScript stack.

    Output Format:
    - Page Object in \`\`\`typescript\`\`\` block labeled as page-object.ts
    - Test file in \`\`\`typescript\`\`\` block labeled as component.spec.ts

    Tone:
    - Professional, modern, type-safe, best-practice focused.
  `,

  /**
   * Cucumber Feature File Only Prompt (for Playwright)
   */
  PLAYWRIGHT_TYPESCRIPT_FEATURE_ONLY: `
    Instructions:
    - Generate ONLY a Cucumber (.feature) file.
    - Use Scenario Outline with Examples table.
    - Make sure every step is relevant to the provided DOM.
    - Do not combine multiple actions into one step.
    - Use South India realistic dataset (names, addresses, pin codes, mobile numbers).
    - Use dropdown values only from provided DOM.
    - Generate multiple scenarios if applicable.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`

    Example:
    \`\`\`gherkin
    Feature: Login to Application

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "testuser" | "testpass"|
      | "admin"    | "admin123"|
    \`\`\`

    Persona:
    - Audience: BDD testers who only need feature files for Playwright.

    Output Format:
    - Only valid Gherkin in a \`\`\`gherkin\`\`\` block.

    Tone:
    - Clear, structured, executable.
  `,

  /**
   * Selenium Java Full: Feature File + Page Object + Step Definitions
   */
  SELENIUM_JAVA_ALL: `
    Instructions:
    - Generate ALL THREE artifacts in order:
      1. A Cucumber (.feature) file.
      2. A Selenium Java Page Object Class.
      3. A Java step definition class that uses the Page Object.
    - Use Scenario Outline with Examples table (South India realistic data).
    - Page Object must use @FindBy annotations and PageFactory.
    - Step definitions must import and use the Page Object class.
    - Include WebDriver setup/teardown in step definitions.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to Application

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I enter "<username>" into the Username field
      And I enter "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "admin"    | "admin123"|
    \`\`\`

    \`\`\`java
    // LoginPage.java
    package com.testleaf.pages;

    import org.openqa.selenium.*;
    import org.openqa.selenium.support.*;

    public class LoginPage {
        private WebDriver driver;

        @FindBy(id = "username")
        private WebElement usernameField;

        @FindBy(id = "password")
        private WebElement passwordField;

        @FindBy(xpath = "//button[contains(text(),'Login')]")
        private WebElement loginButton;

        public LoginPage(WebDriver driver) {
            this.driver = driver;
            PageFactory.initElements(driver, this);
        }

        public void enterUsername(String username) { usernameField.sendKeys(username); }
        public void enterPassword(String password) { passwordField.sendKeys(password); }
        public void clickLogin() { loginButton.click(); }
    }
    \`\`\`

    \`\`\`java
    // LoginStepDefinitions.java
    package com.testleaf.stepdefs;

    import io.cucumber.java.en.*;
    import io.cucumber.java.*;
    import org.openqa.selenium.*;
    import org.openqa.selenium.chrome.ChromeDriver;
    import org.openqa.selenium.support.ui.*;
    import com.testleaf.pages.LoginPage;

    public class LoginStepDefinitions {
        private WebDriver driver;
        private WebDriverWait wait;
        private LoginPage loginPage;

        @Before
        public void setUp() {
            driver = new ChromeDriver();
            wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            driver.manage().window().maximize();
            loginPage = new LoginPage(driver);
        }

        @After
        public void tearDown() {
            if (driver != null) driver.quit();
        }

        @Given("I open the login page")
        public void openLoginPage() { driver.get("\${pageUrl}"); }

        @When("I enter {string} into the Username field")
        public void enterUsername(String username) { loginPage.enterUsername(username); }

        @When("I enter {string} into the Password field")
        public void enterPassword(String password) { loginPage.enterPassword(password); }

        @When("I click the Login button")
        public void clickLogin() { loginPage.clickLogin(); }

        @Then("I should be logged in successfully")
        public void verifyLogin() {
            WebElement success = wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("success")));
            assert success.isDisplayed();
        }
    }
    \`\`\`

    Persona:
    - Audience: QA engineers using Cucumber + Selenium Java with Page Object Model.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block, Page Object in \`\`\`java\`\`\` block (labeled LoginPage.java), Step Definitions in \`\`\`java\`\`\` block (labeled LoginStepDefinitions.java).

    Tone:
    - Professional, maintainable, enterprise-ready.
  `,

  /**
   * Playwright TypeScript Full: Feature File + Page Object + Step Definitions
   */
  PLAYWRIGHT_TYPESCRIPT_ALL: `
    Instructions:
    - Generate ALL THREE artifacts in order:
      1. A Cucumber (.feature) file.
      2. A Playwright TypeScript Page Object Class.
      3. A TypeScript step definitions file that uses the Page Object.
    - Use Scenario Outline with Examples table (South India realistic data).
    - Page Object must use Playwright locators and Locator properties.
    - Step definitions must import and use the Page Object class.
    - Use @cucumber/cucumber decorators for step definitions.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to Application

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I enter "<username>" into the Username field
      And I enter "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "admin"    | "admin123"|
    \`\`\`

    \`\`\`typescript
    // login.page.ts
    import { Page, Locator } from '@playwright/test';

    export class LoginPage {
      readonly page: Page;
      readonly usernameField: Locator;
      readonly passwordField: Locator;
      readonly loginButton: Locator;

      constructor(page: Page) {
        this.page = page;
        this.usernameField = page.locator('input[id="username"]');
        this.passwordField = page.locator('input[id="password"]');
        this.loginButton   = page.locator('button:has-text("Login")');
      }

      async navigateTo(): Promise<void> { await this.page.goto('\${pageUrl}'); }
      async enterUsername(username: string): Promise<void> { await this.usernameField.fill(username); }
      async enterPassword(password: string): Promise<void> { await this.passwordField.fill(password); }
      async clickLogin(): Promise<void> { await this.loginButton.click(); }
    }
    \`\`\`

    \`\`\`typescript
    // login.steps.ts
    import { Given, When, Then, Before, After } from '@cucumber/cucumber';
    import { chromium, Browser, Page, expect } from '@playwright/test';
    import { LoginPage } from './login.page';

    let browser: Browser;
    let page: Page;
    let loginPage: LoginPage;

    Before(async function () {
      browser = await chromium.launch();
      page = await browser.newPage();
      loginPage = new LoginPage(page);
    });

    After(async function () { await browser.close(); });

    Given('I open the login page', async function () { await loginPage.navigateTo(); });

    When('I enter {string} into the Username field', async function (username: string) {
      await loginPage.enterUsername(username);
    });

    When('I enter {string} into the Password field', async function (password: string) {
      await loginPage.enterPassword(password);
    });

    When('I click the Login button', async function () { await loginPage.clickLogin(); });

    Then('I should be logged in successfully', async function () {
      const success = page.locator('.success, .logged-in, [data-testid="success"]');
      await expect(success).toBeVisible();
    });
    \`\`\`

    Persona:
    - Audience: QA engineers using Cucumber + Playwright TypeScript with Page Object Model.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block, Page Object in \`\`\`typescript\`\`\` block (labeled login.page.ts), Step Definitions in \`\`\`typescript\`\`\` block (labeled login.steps.ts).

    Tone:
    - Professional, modern, type-safe, enterprise-ready.
  `,

  /**
   * Cucumber Feature File with Playwright TypeScript Step Definitions
   */
  PLAYWRIGHT_TYPESCRIPT_WITH_FEATURE_AND_TESTS: `
    Instructions:
    - Generate BOTH:
      1. A Cucumber .feature file.
      2. Playwright TypeScript step definitions file.
    - Do NOT include Page Object code separately (integrate with step defs).
    - Step definitions must include Playwright setup, explicit waits, and actual Playwright code.
    - Use Scenario Outline with Examples table (South India realistic data).
    - Use proper Playwright selectors and locators.

    Context:
    DOM:
    \`\`\`html
    \${domContent}
    \`\`\`
    URL: \${pageUrl}

    Example:
    \`\`\`gherkin
    Feature: Login to Application

    Scenario Outline: Successful login with valid credentials
      Given I open the login page
      When I type "<username>" into the Username field
      And I type "<password>" into the Password field
      And I click the Login button
      Then I should be logged in successfully

    Examples:
      | username   | password  |
      | "admin"    | "admin123"|
    \`\`\`

    \`\`\`typescript
    import { Given, When, Then, Before, After } from '@cucumber/cucumber';
    import { Page, expect } from '@playwright/test';
    import { chromium, Browser } from '@playwright/test';

    let browser: Browser;
    let page: Page;

    Before(async function() {
      browser = await chromium.launch();
      page = await browser.newPage();
    });

    After(async function() {
      await browser.close();
    });

    Given('I open the login page', async function() {
      await page.goto('\${pageUrl}');
    });

    When('I type {string} into the Username field', async function(username: string) {
      await page.fill('input[id="username"]', username);
    });

    When('I type {string} into the Password field', async function(password: string) {
      await page.fill('input[id="password"]', password);
    });

    When('I click the Login button', async function() {
      await page.click('button:has-text("Login")');
    });

    Then('I should be logged in successfully', async function() {
      const successElement = page.locator('.success, .logged-in, [data-testid="success"]');
      await expect(successElement).toBeVisible();
    });
    \`\`\`

    Persona:
    - Audience: QA engineers working with Cucumber & Playwright TypeScript.

    Output Format:
    - Gherkin in \`\`\`gherkin\`\`\` block + TypeScript code in \`\`\`typescript\`\`\` block.

    Tone:
    - Professional, executable, structured, modern.
  `
};

/**
 * Helper function to escape code blocks in prompts
 */
function escapeCodeBlocks(text) {
  return text.replace(/```/g, '\\`\\`\\`');
}

/**
 * Function to fill template variables in a prompt
 */
export function getPrompt(promptKey, variables = {}) {
  let prompt = DEFAULT_PROMPTS[promptKey];
  if (!prompt) {
    throw new Error(`Prompt not found: ${promptKey}`);
  }

  Object.entries(variables).forEach(([k, v]) => {
    const regex = new RegExp(`\\$\\{${k}\\}`, 'g');
    prompt = prompt.replace(regex, v);
  });

  return prompt.trim();
}

export const CODE_GENERATOR_TYPES = {
  SELENIUM_JAVA_PAGE_ONLY: 'Selenium-Java-Page-Only',
  CUCUMBER_ONLY: 'Cucumber-Only',
  CUCUMBER_WITH_SELENIUM_JAVA_STEPS: 'Cucumber-With-Selenium-Java-Steps',
  SELENIUM_JAVA_ALL: 'Selenium-Java-All',
  PLAYWRIGHT_TYPESCRIPT_PAGE_ONLY: 'Playwright-TypeScript-Page-Only',
  PLAYWRIGHT_TYPESCRIPT_WITH_TESTS: 'Playwright-TypeScript-With-Tests',
  PLAYWRIGHT_TYPESCRIPT_FEATURE_ONLY: 'Playwright-TypeScript-Feature-Only',
  PLAYWRIGHT_TYPESCRIPT_WITH_FEATURE_AND_TESTS: 'Playwright-TypeScript-With-Feature-And-Tests',
  PLAYWRIGHT_TYPESCRIPT_ALL: 'Playwright-TypeScript-All',
};
