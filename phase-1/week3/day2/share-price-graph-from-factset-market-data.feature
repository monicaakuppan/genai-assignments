Feature: Share Price Graph from FactSet Market Data
  As a user, I want to view an interactive share price graph populated with FactSet market data on the page
  so that I can analyze historical and current share price performance.
  I want to be able to interact with the graph and view accurate and fresh data
  so that I can make informed decisions.

Background:
  Given the page is loaded for a valid security/ticker

@functional-positive @P1 @smoke
Scenario: Valid security/ticker data integration
  Given the page is loaded for a valid security/ticker symbol "AAPL"
  When the system requests share price data
  Then the system must successfully retrieve OHLC and volume data from the FactSet Market Data API

@functional-negative @P2
Scenario: Invalid security/ticker data integration
  Given the page is loaded for an invalid security/ticker symbol "XXXX"
  When the system requests share price data
  Then an error message is displayed indicating invalid security/ticker

@functional-negative @P2
Scenario: Data integration with missing credentials
  Given the page is loaded without necessary credentials
  When the system requests share price data
  Then an error message is displayed indicating missing credentials

@functional-positive @P1 @smoke
Scenario: Graph rendering with valid data
  Given valid data is retrieved from FactSet Market Data API
  When the page renders
  Then a share price graph must display with X-axis and Y-axis
  And a visible plotted price line is displayed
  And the graph must render within 2 seconds of receiving data

@functional-negative @P2
Scenario: Graph rendering with invalid data
  Given invalid data is retrieved from FactSet Market Data API
  When the page renders
  Then an error message is displayed indicating invalid data

@functional-positive @P1 @smoke
Scenario Outline: Time range selection with valid range
  Given the graph is rendered with valid data
  When the user selects a valid time range "<range>"
  Then the graph is updated with the new time range
  Examples:
    | range |
    | 1D    |
    | 5D    |
    | 1M    |

@functional-negative @P2
Scenario: Time range selection with invalid range
  Given the graph is rendered with valid data
  When the user selects an invalid time range "XXXX"
  Then an error message is displayed indicating invalid time range

@functional-positive @P1 @smoke
Scenario: Graph interactivity with hover
  Given the graph is rendered with valid data
  When the user hovers over the graph
  Then a tooltip is displayed with date, price, and volume

@functional-positive @P1 @smoke
Scenario: Graph interactivity with zoom and pan
  Given the graph is rendered with valid data
  When the user zooms and pans the graph
  Then the graph is updated correctly

@functional-positive @P1 @smoke
Scenario: Data accuracy and freshness with valid data
  Given valid data is retrieved from FactSet Market Data API
  When the page renders
  Then the data is accurate and fresh
  And the "Last updated" timestamp is displayed

@functional-negative @P2
Scenario: Data accuracy and freshness with invalid data
  Given invalid data is retrieved from FactSet Market Data API
  When the page renders
  Then an error message is displayed indicating invalid data

@functional-negative @P2
Scenario: Error handling with API call failure
  Given the API call fails
  When the system requests share price data
  Then an error message is displayed indicating API call failure

@functional-negative @P2
Scenario: Error handling with no data
  Given no data is retrieved from FactSet Market Data API
  When the page renders
  Then an error message is displayed indicating no data

@functional-positive @P1 @smoke
Scenario: Performance with initial graph load
  Given the page is loaded for the first time
  When the graph is loaded
  Then the graph is loaded within 3 seconds

@functional-positive @P1 @smoke
Scenario Outline: Performance with time range selection
  Given the graph is rendered with valid data
  When the user selects a valid time range "<range>"
  Then the graph is updated within 1.5 seconds
  Examples:
    | range |
    | 1D    |
    | 5D    |
    | 1M    |

@functional-positive @P1 @smoke
Scenario: Responsive and accessible design on desktop
  Given the page is loaded on desktop
  When the graph is rendered
  Then the graph is rendered correctly

@functional-positive @P1 @smoke
Scenario: Responsive and accessible design on mobile
  Given the page is loaded on mobile
  When the graph is rendered
  Then the graph is rendered correctly

@functional-positive @P1 @smoke
Scenario: Security and compliance with valid credentials
  Given valid credentials are provided
  When the graph is rendered
  Then the graph is rendered correctly

@functional-negative @P2
Scenario: Security and compliance with invalid credentials
  Given invalid credentials are provided
  When the graph is rendered
  Then an error message is displayed indicating invalid credentials

@functional-positive @P1 @smoke
Scenario Outline: Browser and device support
  Given the page is loaded on "<browser>"
  When the graph is rendered
  Then the graph is rendered correctly
  Examples:
    | browser    |
    | Chrome     |
    | Safari     |
    | Edge       |
    | Firefox    |

@functional-positive @P1 @smoke
Scenario: Logging and monitoring with valid API calls
  Given valid API calls are made
  When the logs are generated
  Then the logs are generated correctly

@functional-negative @P2
Scenario: Logging and monitoring with invalid API calls
  Given invalid API calls are made
  When the logs are generated
  Then error logs are generated correctly

@functional-positive @P1 @smoke
Scenario: Unit testing with valid test cases
  Given valid test cases are written
  When the tests are run
  Then the tests pass correctly

@functional-negative @P2
Scenario: Unit testing with invalid test cases
  Given invalid test cases are written
  When the tests are run
  Then the tests fail correctly