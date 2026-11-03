# OpenAI

Reached through the OpenAI platform's help centre (help.openai.com) or the usage page of each account in the
dashboard (platform.openai.com/usage).

### cached-tokens-count-against-allowance

Do cached input tokens count toward the complimentary daily token allowance (1M a day on gpt-5.4, 10M on
gpt-5.4-mini, per account), the same as uncached ones?

**Why:** most of the pipeline's input is cached (12.3M of 16.1M tokens in the eval run `one-v2`). The one-call
reader (`one-call-reader`) needs ~2M tokens a day on gpt-5.4 counting cached ones, exactly the two accounts'
allowance; if cached tokens don't count, there is real headroom. A day's usage page against the tokens the backend
logged would also answer it.
