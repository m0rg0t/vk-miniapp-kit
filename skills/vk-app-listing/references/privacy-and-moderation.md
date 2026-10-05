# Privacy and moderation evidence

This is a product checklist, not jurisdiction-specific legal advice.

## Inspect implementation

Search for:

- `VKWebAppGet*`, permissions, API tokens, profile/community access;
- launch parameter parsing and identifiers;
- `localStorage`, IndexedDB, cookies, VK storage, and backend requests;
- analytics, crash reporting, ads, payments, and third-party SDKs;
- file/media/location/contact input;
- account deletion, reset, export, and support paths.

Build a data map:

| Data | Source | Purpose | Storage/processor | Retention | User control |
|---|---|---|---|---|---|
| | | | | | |

## Draft policy sections

1. Product/operator identity and contact
2. Data received and generated
3. Purpose and user-facing necessity
4. Storage, processors, and transfers
5. Retention and deletion/control
6. Analytics, ads, and permissions
7. Security limitations
8. Children/age suitability when relevant
9. Changes and effective date

Use plain language and make the public policy reachable without launching the
app when the catalog requires a URL.

## Moderation handoff

Give a reviewer:

- exact core-flow steps and expected result;
- test account or data only when necessary;
- explanation of requested permissions and when prompts appear;
- monetization/ad placement and reward behavior;
- client/platform-only features;
- known non-blocking limitations;
- support contact and build identifier.

Check known technical rejection reasons before submission:

- in-app sections reached through `<a href>` open as an external site in
  mobile VK clients (on iOS, in the internal browser); the app must switch
  sections through a router;
- app controls in the top-right header corner are covered by the client's
  menu/close buttons; move them, or choose "Над окном" in Настройки →
  Отображение and record it.

Both are owned by `vk-app-design` (`references/host-navigation-and-controls.md`).
After a rejection, quote the moderator's points in the delivery tracker, map
each one to a fix and its real-client evidence, then resubmit.

Do not hide a required permission, external purchase, generated content, or
data transfer in marketing copy.
