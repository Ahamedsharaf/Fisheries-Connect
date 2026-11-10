# October 17 visual refresh

The homepage now has two photographic gateways, quieter editorial typography, a warm neutral canvas and a dark coastal header/footer. Explore uses photographs for all six destinations. Compact price tables were removed from the homepage and Explore; the full /prices page remains available. Articles, FAQs, accounts and admin functions are retained.

Deploy this extracted folder using `npm ci` and `npm run deploy`. Existing Cloudflare secrets remain in place. Set the admin password only if it has not already been configured successfully, using `npm run admin:password`.

Validation: TypeScript and production build passed. Desktop homepage gateways, journal and Explore were visually inspected using the existing seeded content in an isolated preview. The local Wrangler CLI encountered an environment network-interface error, so live Cloudflare deployment and full browser account flows were not retested for this visual update. Mobile rules are included; device testing remains recommended.

New asset: public/images/coastal-fishing.png. Generated using the built-in image tool as illustrative imagery, not a documentary photograph of Sainthamaruthu. Prompt: Premium natural editorial landscape of two Sri Lankan fishermen tending nets beside a weathered blue wooden boat on a palm-lined coast, subdued sea blue and warm sand, soft morning light, realistic textures, no text or logos.
