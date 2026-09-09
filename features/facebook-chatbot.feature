Feature: Facebook chatbot for vegan alcohol checking

  Scenario: Health check endpoint responds
    Given the server is running
    When I GET /
    Then I get response "Vegan alcohol checker is up!"

  Scenario: Webhook verification with correct token
    Given WEBHOOK_TOKEN is "test-webhook-token"
    When I GET /webhook/ with query hub.verify_token=test-webhook-token and hub.challenge=12345
    Then I get response "12345"

  Scenario: Webhook verification with wrong token
    When I GET /webhook/ with query hub.verify_token=wrong_token and hub.challenge=12345
    Then I do not get response "12345"

  Scenario: POST webhook with Facebook messaging envelope returns 200
    Given FB_PAGE_TOKEN is "test-page-token"
    When I POST /webhook/ with Facebook messaging envelope
      """
      {"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"guinness"}}]}]}
      """
    Then I get HTTP status 200

  Scenario: Search for guinness returns product with status
    When I POST /webhook/ with message "guinness"
    Then response contains "Guinness is not vegan."

  Scenario: Search for Ørbæk with exclamation mark matches Ørbæk products
    When I POST /webhook/ with message "Ørbæk!"
    Then response contains "Ørbæk"

  Scenario: Search for product with duplicate entries returns one result
    When I POST /webhook/ with message "Wynkoop Rocky Mountain Oyster Stout"
    Then response contains "Wynkoop Rocky Mountain Oyster Stout is Not Vegan Friendly."

  Scenario: Unknown alcohol name returns apology message
    When I POST /webhook/ with message "nonexistentalcoholxyz"
    Then I get response "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

  Scenario: Many matches trigger weblink response
    When I POST /webhook/ with message "e"
    Then response contains "I know a lot of drinks with that name so I made a weblink for you www.vacfb.site/a?n=e"

  Scenario: Search for wynkoop returns products with country
    When I POST /webhook/ with message "wynkoop"
    Then response contains "made in"

  Scenario: Incoming text with "hey, is " prefix returns Guinness result
    When I POST /webhook/ with message "hey, is guinness"
    Then response contains "Guinness is not vegan."

  Scenario: Incoming text with "is " prefix returns Guinness result
    When I POST /webhook/ with message "is guinness"
    Then response contains "Guinness is not vegan."

  Scenario: Incoming text with "are " prefix returns Guinness result
    When I POST /webhook/ with message "are guinness vegan"
    Then response contains "Guinness is not vegan."

  Scenario: Incoming text with "what about " prefix returns Guinness result
    When I POST /webhook/ with message "what about guinness"
    Then response contains "Guinness is not vegan."

  Scenario: Incoming text with "vegan?" suffix returns Guinness result
    When I POST /webhook/ with message "guinness vegan?"
    Then response contains "Guinness is not vegan."

  Scenario: Typo "guiness" is corrected to guinness
    When I POST /webhook/ with message "guiness"
    Then response contains "Guinness is not vegan."

  Scenario: Typo "absolute vodka" is corrected to absolut vodka
    When I POST /webhook/ with message "absolute vodka"
    Then response contains "Absolut"
