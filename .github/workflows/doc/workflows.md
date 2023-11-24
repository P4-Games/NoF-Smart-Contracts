# Github Actions Workflows


## Action Workflow dependabot.yml

Enabling [Dependabot version updates for actions](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/keeping-your-actions-up-to-date-with-dependabot) allow us to get notified of new action releases. 


## Action Workflow slither.yml


The action supports the Github Code Scanning integration, which will push Slither's alerts to the Security tab of the Github project (see [About code scanning](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning)). This integration eases the triaging of findings and improves the continuous integration.

We include `fail-on: none` on the Slither action to avoid failing the run if findings are found. Also, it creates/updates pull requests with the contents of Slither's Markdown report.


[More Info](https://github.com/marketplace/actions/slither-action#examples)