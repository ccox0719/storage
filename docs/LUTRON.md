# New Home: Lutron RadioRA 2

Dealer reference imported October 19, 2026. All records are **documented, physically unverified**. No network discovery, device commands, database changes, or programming transfers were performed.

## What is ready

Open **Systems → Lighting & Automation → Lutron dealer inventory**. Search dealer room names, switch positions, zones, models and controller programming. Expand controller buttons to see exact target levels, fade times, fan speeds and report page references. Download the structured data from the same panel.

The import contains 110 equipment records across installation pages 2–80, 12 controller programming sections, 34 explicitly listed button entries and 198 target actions. The 110 records include remote dimmers, sensors, keypads, a shade, visor controls and infrastructure: they are not 110 independently controllable lights. Two PHPM-PA-120-WH accessories are recorded under their parent dimmers rather than counted as separate table columns.

`data/lutron-radiora2.json` is the portable source; `js/lutron-data.js` is its generated browser equivalent. Both include source filenames, SHA-256 hashes and page counts. `scripts/extract-lutron.py` regenerates them from the two original PDFs using pdfplumber. PDF source files and cover-page contact details are not copied to this public repository.

## Interpretation and limits

- Project name: DREYHOUSE. Both printed reports are dated October 19, 2026. The filenames contain `7-12-26-12.10.0`; this is retained as a filename version hint, not an installation date or verified firmware version.
- 74 distinct reported zone paths include three truncated installation labels and their full programming counterparts. This is a reference index, not a verified load count. Truncated labels have explicit candidate links; they are not silently renamed or merged.
- Original spelling is preserved: LIVINF ROOM SW WALL, BATHRROM, BEDROO LIGHTS, CONTOLLER, EQUIPTMENT ROOM and other dealer labels may need household aliases later. Dealer Equipment Room is not assumed to be the app's Mechanical Room or IT closet.
- `RD-RD` remote dimmers reference loads elsewhere; they are not independent zones. Their attachment notes are preserved. A second Dining Room remote has N/A and no attachment target; ask the dealer.
- Device IDs such as `install-74-1` identify report rows, **not Lutron integration IDs**. Button indexes identify report ordering, not hardware button numbers. The reports do not supply network addresses, integration logins, pairing codes, serial numbers, confirmed firmware, occupancy assignments/settings, timeclock schedules or the editable programming backup.
- Scene target commands remain verbatim alongside numeric level/fade fields. Shade levels are not assumed to mean the same physical direction as light brightness. Fan speeds are separate from dimmer percentages.
- This reference does not seed `home_items`, create locations, overwrite equipment profiles or change household data. Existing system profiles, history, maintenance, storage and sync behavior are preserved. Add verified inventory later after confirming room aliases and avoiding duplicates.

## Items to review with the dealer

1. **Movie SCENE CONTROLS → Off sets LIVING ROOM FAN to High**, keypad p. 2. It is not equivalent to bedroom CONTOLLER → ALL OFF, which sets that fan to Off on p. 5. Do not normalize both into a generic “All Off.”
2. The bedroom drawing includes **SONOS ON**, but the report contains no corresponding action list. BR OFF has a documented list. Garage GARAGE MUSIC shows Audio with no listed button actions. No missing Sonos behavior was invented.
3. Two PATIO → FENCE controllers (POOL PUMP and POOL PUMP DECK) both target POOL PUMP. Confirm the physical equipment and intended operating procedure before any later control test.
4. LAUNDRY ROOM → CEILING FANS has High, Medium and Off for both patio fans. Its raise/lower hardware does not have explicit raise/lower programming entries in this report.
5. FOYER → SHADE has Open 100%, Close 0%, Lower and Raise. Confirm travel/direction on site.
6. Save changes on button hold is Disabled in all 12 programming sections. This describes the export, not a live verified setting.

## Physical visit checklist

| Device | Dealer position | Installation page | Status |
| --- | --- | --- | --- |
| RR-MAIN-REP-WH | Equipment Room / Main Repeater 001 | 74 | Documented only |
| CONNECT-BDG2-1 | Equipment Room / EQUIPTMENT ROOM | 75 | Documented only |
| RR-AUX-REP-WH | Equipment Room / BEDROOM UPSTAIRS | 78 | Documented only |
| RR-AUX-REP-WH | Equipment Room / Kitchen | 80 | Documented only |

Locate and photograph the hardware labels. Record actual locations and whether power/Ethernet are present; inspect auxiliary repeater power/link status too. Privately record repeater and bridge IP/MAC addresses and router reservations. Match each report position to the household's current room names. Start verification with one agreed, ordinary light; record date, person and observed result in existing equipment notes/history. A report record remains unverified until someone checks it.

## Dealer handoff

Request the editable RadioRA 2 project backup, an Integration Report with real device IDs, software/firmware confirmation, sensor/timeclock programming details and a documented integration login. Ask the dealer to confirm Connect Bridge activation and ownership/account/HomeKit handoff. Resolve the fan command discrepancy and unmapped controls. Any login creation or project transfer is a later programming change; this import does not perform it.

## Home Assistant and Apple Home

Home Assistant's [official Lutron integration](https://www.home-assistant.io/integrations/lutron/) (checked October 19, 2026) communicates with the **RadioRA 2 Main Repeater** and requires a username/password configured in Lutron software. Default integration credentials are not configured by default in software version 12 and later. Arrange that with the dealer if no suitable login already exists. Use a stable repeater address, then add **Lutron** under Settings → Devices & services in an authorized Home Assistant session. Compare discovered rooms/entities to the report records before creating automations. Do not guess entity IDs from report names. Review actual fan/shade/audio support and occupancy behavior after discovery.

The **Connect Bridge is a separate Connect/HomeKit path**, not a prerequisite for the direct Main Repeater integration. For Apple Home, locate the bridge, confirm activation/network and account ownership, and retain pairing information privately. See [Lutron's HomeKit setup note](https://www.lutron.com/TechnicalDocumentLibrary/Integrating_HomeKit_with_RA2_and_HWQS.pdf). Home Assistant access and physical/dealer verification are still required to finish a live setup. Private dashboard URLs and credentials must stay outside this public repository.

## Validation and rollback

Run `node tests/lutron.cjs` for data integrity and rendering checks. Run `node tests/lutron-browser.cjs` with the repository served on port 8766 and Playwright available for browser regression checks. No database migration or rollback is required. Reverting this change removes the static reference panel and files without touching household records or Lutron equipment. Source/PR completion does not mean production deployment or successful device integration.
