# How DirtTrails keeps people and money safe

DirtTrails is a booking marketplace. Travelers book hotels, tours, transport, events, and activities. Vendors get paid after a real payment goes through. Restaurant tables are reserved only — no money changes hands on the platform.

This note is for partners, vendors, and anyone who is not an engineer.

---

## Who can see what

There are three kinds of account.

**Travelers** can browse listings, book, and see their own trips and messages. They cannot see another traveler’s details, a vendor’s bank or mobile-money details, or the admin screens.

**Vendors** can run their own business: listings, bookings, and their own wallet. They cannot see another vendor’s money, and they cannot mark a booking as paid themselves. New vendors wait for approval before the vendor portal opens.

**Admins** (DirtTrails staff) can see the full picture so they can help with problems, approve vendors, and fix a payment that got stuck. They still cannot read private traveler–vendor chat that was sent as an encrypted message.

If you are not signed in, you can still browse public listings. You cannot open wallets, payout details, or other people’s bookings as if they were yours.

---

## How payments work

For hotels, tours, transport, events, and activities, money is collected through **MarzPay** (MTN and Airtel mobile money). DirtTrails does not take the cash in the website.

A booking is only treated as **paid** after MarzPay confirms the payment. The website cannot “tick paid” on its own. That stops someone from faking a payment and getting tickets or a vendor payout.

Vendors are paid after the booking is genuinely complete — not the moment a traveler starts checkout.

**Restaurants are different.** A restaurant booking is a table reservation. No mobile-money charge, no vendor wallet, no commission on that booking.

---

## How private messages work

Messages between travelers and vendors can be encrypted on the device. DirtTrails staff cannot read those encrypted chats. Subject lines and who messaged whom are still visible so support can help if something goes wrong.

If someone clears their browser data, they may lose the key to old encrypted messages. That is expected with this design.

---

## What we are still tightening

The core money rule is in place: the site cannot invent a paid booking.

A few areas still need extra locks so that booking lists, tickets, and some internal tools are as tight as wallets already are. That work is on the engineering list. It does not change the rule that **a fake “paid” click cannot move money**.

---

## In plain terms

| Question | Answer |
|---|---|
| Can a traveler see a vendor’s payout details? | No |
| Can a vendor mark a trip as paid without MarzPay? | No |
| Does a restaurant reservation take payment? | No |
| Who confirms that money actually arrived? | MarzPay, not the website |
| Can DirtTrails read encrypted private chats? | No |

Questions: contact DirtTrails support.
