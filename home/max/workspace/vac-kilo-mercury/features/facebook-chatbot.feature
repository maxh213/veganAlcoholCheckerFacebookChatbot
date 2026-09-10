Feature: Facebook Chatbot
  As a Facebook user, I want to ask about alcohol products so that I can get vegan-friendly information

  Background:
    Given the bot is running

  Scenario: Health check endpoint
    When I send GET / to the bot
    Then the response is "Vegan alcohol checker is up!"

  Scenario: Webhook verification with valid token
    Given I send GET /webhook/?hub.verify_token=test-webhook-token&hub.challenge=hello
    Then the response is "hello"

  Scenario: Webhook verification with invalid token
    When I send GET /webhook/?hub.verify_token=wrong-token&hub.challenge=hello
    Then the response contains "Error, wrong token"

  Scenario: Facebook messaging webhook accepts any message
    Given I send POST /webhook/ with a Facebook messaging envelope
    When the bot processes the message
    Then the response status is 200

  Scenario: Search is case-insensitive substring match
    When I search for "vodka"
    Then results include "Absolut Vodka" and "Deep Eddy Vodka"

  Scenario: Search strips punctuation and spaces
    When I search for "deep-eddy"
    Then results include "Deep Eddy Vodka"

  Scenario: Duplicate products appear only once
    Given two products have same name, status, and country
    When I search for that product
    Then only one result is returned

  Scenario: Unknown product returns apology message
    When I search for "xyzzy unknown drink"
    Then the response is "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

  Scenario: More than 20 matches return a weblink
    When I search for "a"
    And there are more than 20 matches
    Then the response is "I know a lot of drinks with that name so I made a weblink for you www.vacfb.site/a?n=" plus the original message text

  Scenario: 20 or fewer matches return individual messages
    When I search for "absolut vodka"
    Then the bot sends one message per result including country when present

  Scenario: Text prefix stripping - "hey, is"
    When I search "hey, is Absolut Vodka"
    Then the search term is "Absolut Vodka"

  Scenario: Text prefix stripping - "is"
    When I search "is Absolut Vodka"
    Then the search term is "Absolut Vodka"

  Scenario: Text prefix stripping - "are"
    When I search "are Absolut Vodka"
    Then the search term is "Absolut Vodka"

  Scenario: Text prefix stripping - "what about"
    When I search "what about Absolut Vodka"
    Then the search term is "Absolut Vodka"

  Scenario: Text prefix stripping - "vegan?"
    When I search "Absolut Vodka vegan?"
    Then the search term is "Absolut Vodka"

  Scenario: Name correction - guiness to guinness
    When I search for "guiness"
    Then the search term is "guinness"

  Scenario: Name correction - absolute vodka to absolut vodka
    When I search for "absolute vodka"
    Then the search term is "absolut vodka"
