Feature: Facebook chatbot for vegan alcohol checking

  Scenario: Health check endpoint responds
    Given the server is running
    When I GET /
    Then I get response "Vegan alcohol checker is up!"

  Scenario: Webhook verification with correct token
    Given WEBHOOK_TOKEN is set
    When I GET /webhook/ with query hub.verify_token=correct_token and hub.challenge=12345
    Then I get response "12345"

  Scenario: Webhook verification with wrong token
    When I GET /webhook/ with query hub.verify_token=wrong_token and hub.challenge=12345
    Then I do not get response "12345"

  Scenario: POST webhook with Facebook messaging envelope
    Given FB_PAGE_TOKEN is set
    When I POST /webhook/ with Facebook messaging envelope {"entry": [{"messaging": [{"sender": {"id": "user123"}, "message": {"text": "guinness"}}]}]}
    Then I get HTTP status 200

  Scenario: Search is case-insensitive substring matching
    When I search for "guinness"
    Then I get "Guinness" products

  Scenario: Search strips punctuation and spaces
    When I search for "Ørbæk!"
    Then I get "Ørbæk" products

  Scenario: Duplicate products appear once
    When I search for "Wynkoop Rocky Mountain Oyster Stout"
    Then I get one result for that product

  Scenario: Unknown name returns apology message
    When I search for "nonexistentalcoholxyz"
    Then I get "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

  Scenario: More than 20 matches sends weblink
    When I search for "e" which matches many products
    Then I get a weblink response with URL www.vacfb.site/a?n=

  Scenario: 20 or fewer matches sends Facebook messages with country
    When I search for "guinness"
    Then each message includes country when present

  Scenario: Incoming text normalization strips "hey, is " prefix
    When user sends "hey, is guinness"
    Then search receives "guinness"

  Scenario: Incoming text normalization strips "is " prefix
    When user sends "is guinness"
    Then search receives "guinness"

  Scenario: Incoming text normalization strips "are " prefix
    When user sends "are guinness vegan"
    Then search receives "guinness vegan"

  Scenario: Incoming text normalization strips "what about " prefix
    When user sends "what about guinness"
    Then search receives "guinness"

  Scenario: Incoming text normalization strips "vegan?" suffix
    When user sends "guinness vegan?"
    Then search receives "guinness "

  Scenario: guiness typo is rewritten to guinness
    When user sends "guiness"
    Then search receives "guinness"

  Scenario: absolute vodka typo is rewritten to absolut vodka
    When user sends "absolute vodka"
    Then search receives "absolut vodka"
