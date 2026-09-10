Feature: Vegan alcohol checker Facebook chatbot
  Nothing about the bot's behaviour may change.
  Live routes are GET /, GET /webhook/, and POST /webhook/.
  Chat replies are POST https://graph.facebook.com/v2.6/me/messages
  with query access_token equal to FB_PAGE_TOKEN (test-page-token when unset)
  and JSON { recipient: { id: sender }, message: { text: reply } }.
  Product replies keep the trailing space after the period.
  Duplicate means the same product_name, status, and country.

  Scenario: Health check
    When someone GETs /
    Then the HTTP status is 200
    And the body is exactly "Vegan alcohol checker is up!"

  Scenario: Facebook verifies the webhook with the right token
    Given WEBHOOK_TOKEN is "test-webhook-token"
    When Facebook GETs /webhook/?hub.verify_token=test-webhook-token&hub.challenge=abc123
    Then the HTTP status is 200
    And the body is exactly "abc123"

  Scenario: Facebook verifies the webhook with the wrong token
    Given WEBHOOK_TOKEN is "test-webhook-token"
    When Facebook GETs /webhook/?hub.verify_token=wrong&hub.challenge=abc123
    Then the HTTP status is 200
    And the body is exactly "Error, wrong token"
    And the body is not "abc123"

  Scenario: Facebook verifies the webhook with no token
    When Facebook GETs /webhook/?hub.challenge=abc123
    Then the HTTP status is 200
    And the body is exactly "Error, wrong token"
    And the body is not "abc123"

  Scenario: Unknown drink name
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "xyzzynotadrink"
    Then the HTTP status is 200
    And the bot sends one Graph message to "111" whose text is "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

  Scenario: One match with no country
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "Widmer"
    Then the HTTP status is 200
    And the bot sends one Graph message to "111" whose text is "Widmer is Vegan Friendly. "

  Scenario: One match with a country
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "Wickwar Beer"
    Then the HTTP status is 200
    And the bot sends one Graph message to "111" whose text is "Wickwar Beer made in England is Not Vegan Friendly. "

  Scenario: Search is case-insensitive substring after stripping punctuation and spaces
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "WIDMER"
    Then the bot sends one Graph message to "111" whose text is "Widmer is Vegan Friendly. "
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "wid mer"
    Then the bot sends one Graph message to "111" whose text is "Widmer is Vegan Friendly. "
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "Guinness (brewed in Australia)"
    Then the bot sends one Graph message to "111" whose text is "Guinness (brewed in Australia) is Vegan Friendly. "
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "WickwarBeer"
    Then the bot sends one Graph message to "111" whose text is "Wickwar Beer made in England is Not Vegan Friendly. "

  Scenario: Duplicate catalogue rows appear once
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "Wynkoop Rocky Mountain Oyster Stout"
    Then the bot sends exactly one Graph message to "111"
    And that text is "Wynkoop Rocky Mountain Oyster Stout made in USA is Not Vegan Friendly. "

  Scenario: Same name with different country or status appears twice
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "Carling Black Label"
    Then the bot sends exactly two Graph messages to "111"
    And one text is "Carling Black Label made in South Africa is Vegan Friendly. "
    And one text is "Carling Black Label made in England is Not Vegan Friendly. "

  Scenario: More than 20 matches send one weblink using the original message
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "hey, is arrington vegan?"
    Then the HTTP status is 200
    And the bot sends exactly one Graph message to "111"
    And that text is "I know a lot of drinks with that name so I made a weblink for you www.vacfb.site/a?n=hey, is arrington vegan?"

  Scenario: Twenty matches send one Facebook message per result
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "alpine"
    Then the HTTP status is 200
    And the bot sends exactly 20 Graph messages to "111"
    And none of those texts contains "www.vacfb.site/a?n="

  Scenario: Twenty or fewer Guinness matches send one message per result
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "guinness"
    Then the bot sends exactly 9 Graph messages to "111" in this order:
      | Guinness is Not Vegan Friendly. |
      | Guinness (brewed in Australia) is Vegan Friendly. |
      | Guinness Black Lager is Not Vegan Friendly. |
      | Guinness Blonde American Lager is Vegan Friendly. |
      | Guinness Extra Stout - Canadian brewed and bottled is Not Vegan Friendly. |
      | Guinness Extra Stout - UK is Not Vegan Friendly. |
      | Guinness Foreign Extra Stout is Not Vegan Friendly. |
      | Guinness Porter is Not Vegan Friendly. |
      | Guinness The 1759 is Not Vegan Friendly. |

  Scenario Outline: Filler phrases are stripped before search
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "<text>"
    Then the HTTP status is 200
    And the bot sends one Graph message to "111" whose text is "Widmer is Vegan Friendly. "

    Examples:
      | text |
      | hey, is Widmer vegan? |
      | Hey, is Widmer vegan? |
      | hey is Widmer vegan? |
      | Hey is Widmer vegan? |
      | is Widmer vegan? |
      | Is Widmer vegan? |
      | IS Widmer vegan? |
      | Are Widmer vegan? |
      | are Widmer vegan? |
      | ARE Widmer vegan? |
      | what about Widmer vegan? |
      | Widmer vegan? |
      | Widmer Vegan? |

  Scenario Outline: guiness is rewritten to guinness before search
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "<text>"
    Then the bot sends exactly 9 Graph messages to "111"
    And the first text is "Guinness is Not Vegan Friendly. "
    And none of those texts is "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

    Examples:
      | text |
      | guiness |
      | Guiness |

  Scenario: absolute vodka is rewritten to absolut vodka before search
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "absolute vodka"
    Then the bot sends one Graph message to "111" whose text is "Absolut Vodka made in Sweden is Vegan Friendly. "

  Scenario: POST webhook always returns 200 and uses the page token
    Given FB_PAGE_TOKEN is "test-page-token"
    When Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "Widmer"
    Then the HTTP status is 200
    And the Graph call is POST https://graph.facebook.com/v2.6/me/messages?access_token=test-page-token
    And the Graph JSON recipient id is "111"
    When Facebook POSTs {"entry":[{"messaging":[{"sender":{"id":"111"},"delivery":{"mids":["m1"]}}]}]} to /webhook/
    Then the HTTP status is 200
    And the bot sends no Graph message
    When Facebook POSTs {"entry":[{"messaging":[]}]} to /webhook/
    Then the HTTP status is 200
    And the bot sends no Graph message
    When Facebook Graph returns an error body
    And Facebook POSTs a messaging envelope to /webhook/ for sender "111" with text "Widmer"
    Then the HTTP status is still 200

  Scenario: POST webhook with a null entry is HTTP 500
    When Facebook POSTs {"object":"page","entry":null} to /webhook/
    Then the HTTP status is 500
    And the body contains "TypeError"
    And the process is still running

  Scenario: POST webhook with an empty entry array is HTTP 500
    When Facebook POSTs {"object":"page","entry":[]} to /webhook/
    Then the HTTP status is 500
    And the body contains "TypeError"
    And the process is still running
