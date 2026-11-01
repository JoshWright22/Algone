# Security

## Report a problem

Report security problems privately through a GitHub private advisory:
<https://github.com/JoshWright22/Algone/security/advisories/new>

Please do not open a public issue for a security problem. Include what you found, how to reproduce it, and the version or commit.

Algone is maintained by volunteers, so there is no fixed response time. Reports are read as soon as possible.

## In scope

- The extension, including its message handling and panels.
- The rules file and its validator. A rules file should never be able to run code, click, navigate, send data, or add sites.
- Algone Browser's native bridge and navigation allow-list.
- The release and automation workflows.

## Out of scope

- Getting around an unlock barrier. Barriers interrupt autopilot and are not a security boundary. Changing the system clock, using another browser, or uninstalling all get around them, and uninstalling always works.
- Bugs in the websites Algone works on.
