Feature: Facebook chatbot endpoint verification
  As a user, I want the bot to respond correctly to HTTP requests

  Scenario: Root endpoint returns status message
    When I send a GET request to "/"
    Then the response body is "Vegan alcohol checker is up!"

  Scenario: Webhook verification with valid token
    Given the query param "hub.verify_token" equals "test-webhook-token"
    And the query param "hub.challenge" equals "challenge-123"
    When I send a GET request to "/webhook/"
    Then the response body is "challenge-123"

  Scenario: Webhook verification with invalid token
    Given the query param "hub.verify_token" equals "wrong-token"
    When I send a GET request to "/webhook/"
    Then the response body is not "challenge-123"

  Scenario: Facebook webhook posts reply with page token
    Given the request body contains a Facebook messaging envelope with a text message
    When I send a POST request to "/webhook/"
    Then the response status code is 200
    And the request to sendTextMessage uses the environment token "FB_PAGE_TOKEN"

  Scenario: Search is case-insensitive
    When I send a POST request with message text "guinness"
    Then the response matches products with name "Ørbæk IPA"

  Scenario: Search strips punctuation
    When I send a POST request with message text "Guinness!"
    Then the response matches products with name "Ørbæk IPA"

  Scenario: Search strips spaces
    When I send a POST request with message text "guin ness"
    Then the response matches products with name "Ørbæk IPA"

  Scenario: Duplicate products appear once
    Given the search returns products with same name status and country
    Then the response contains only one entry

  Scenario: Unknown name returns error message
    When I send a POST request with message text "unknowndrinkxyz123"
    Then the response message is "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

  Scenario: More than 20 matches return weblink
    When I send a POST request with message text "beer"
    Then the response message contains "www.vacfb.site/a?n="
    And the response message contains the original text "beer"

  Scenario: Twenty or fewer matches return individual messages with country
    When I send a POST request with message text "Ægir"
    Then the response contains individual messages per product
    And each message with a country includes it in the format "made in {country}"

  Scenario: Incoming text has prefixes stripped
    When I send a POST request with message text "hey, is guiness"
    Then the search uses the text "guinness"

  Scenario: Incoming text has "is " stripped
    When I send a POST request with message text "is guiness"
    Then the search uses the text "guinness"

  Scenario: Incoming text has "are " stripped
    When I send a POST request with message text "are guiness"
    Then the search uses the text "guinness"

  Scenario: Incoming text has "what about " stripped
    When I send a POST request with message text "what about guiness"
    Then the search uses the text "guinness"

  Scenario: Incoming text has "vegan?" stripped
    When I send a POST request with message text "guinness vegan?"
    Then the search uses the text "guinness"

  Scenario: Guiness is rewritten to Guinness
    When I send a POST request with message text "guiness"
    Then the search uses the text "guinness"

  Scenario: Absolute vodka is rewritten to Absolut vodka
    When I send a POST request with message text "absolute vodka"
    Then the search uses the text "absolut vodka"
