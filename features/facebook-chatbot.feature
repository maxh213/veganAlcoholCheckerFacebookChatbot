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

  Scenario: Search matches products case-insensitively
    When I send a POST request with message text "Ørbæk IPA"
    Then the response contains product "Ørbæk IPA"

  Scenario: Search strips punctuation
    When I send a POST request with message text "Ægir!"
    Then the response contains products matching "Ægir"

  Scenario: Search strips spaces
    When I send a POST request with message text "Y o r k  B e e r s"
    Then the response contains products matching "York Beers"

  Scenario: Duplicate products with same name, status, and country appear once
    When I send a POST request with message text "Wynkoop Rocky Mountain Oyster Stout"
    Then the response contains the product "Wynkoop Rocky Mountain Oyster Stout" once

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

  Scenario: Incoming text has "hey, is " prefix stripped
    When I send a POST request with message text "hey, is Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "Hey, is " prefix stripped
    When I send a POST request with message text "Hey, is Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "hey is " prefix stripped
    When I send a POST request with message text "hey is Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "Hey is " prefix stripped
    When I send a POST request with message text "Hey is Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "is " prefix stripped
    When I send a POST request with message text "is Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "Is " prefix stripped
    When I send a POST request with message text "Is Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "IS " prefix stripped
    When I send a POST request with message text "IS Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "Are " prefix stripped
    When I send a POST request with message text "Are Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "are " prefix stripped
    When I send a POST request with message text "are Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "ARE " prefix stripped
    When I send a POST request with message text "ARE Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "what about " prefix stripped
    When I send a POST request with message text "what about Ørbæk"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "vegan?" suffix stripped
    When I send a POST request with message text "Ørbæk vegan?"
    Then the response contains products matching "Ørbæk"

  Scenario: Incoming text has "Vegan?" suffix stripped
    When I send a POST request with message text "Ørbæk Vegan?"
    Then the response contains products matching "Ørbæk"

  Scenario: Guiness is rewritten to Guinness
    When I send a POST request with message text "guiness"
    Then the response matches text "guinness"

  Scenario: Absolute vodka is rewritten to Absolut vodka
    When I send a POST request with message text "absolute vodka"
    Then the response matches text "absolut vodka"