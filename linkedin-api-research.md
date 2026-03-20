# LinkedIn API Research: Posting Content Programmatically

## 1. API Endpoints for Posting Content

### Posts API (Primary — replaces the deprecated ugcPosts API)

**Base Endpoint:** `POST https://api.linkedin.com/rest/posts`

**Required Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
X-Restli-Protocol-Version: 2.0.0
Linkedin-Version: {YYYYMM}   (e.g. "202602")
```

### Supported Content Types (Organic Posts)
| Type | Supported |
|------|-----------|
| Text only | ✅ |
| Images | ✅ |
| Videos | ✅ |
| Documents | ✅ |
| Articles (link shares) | ✅ |
| Multi-Image | ✅ |
| Polls | ✅ |
| Carousels | ❌ (sponsored only) |

---

## 2. How to Create a Text Post

```json
POST https://api.linkedin.com/rest/posts

{
  "author": "urn:li:person:{your_person_id}",
  "commentary": "Your post text here! #hashtag",
  "visibility": "PUBLIC",
  "distribution": {
    "feedDistribution": "MAIN_FEED",
    "targetEntities": [],
    "thirdPartyDistributionChannels": []
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
```

**Response:** `201 Created` with header `x-restli-id` containing the Post URN (e.g., `urn:li:share:6844785523593134080`).

### For a Personal Profile
- Set `author` to `urn:li:person:{personId}`
- Requires the `w_member_social` scope

### For a Company Page
- Set `author` to `urn:li:organization:{orgId}`
- Requires the `w_organization_social` scope

---

## 3. How to Create an Article / Link Post

```json
POST https://api.linkedin.com/rest/posts

{
  "author": "urn:li:person:{your_person_id}",
  "commentary": "Check out this article!",
  "visibility": "PUBLIC",
  "distribution": {
    "feedDistribution": "MAIN_FEED",
    "targetEntities": [],
    "thirdPartyDistributionChannels": []
  },
  "content": {
    "article": {
      "source": "https://example.com/article",
      "thumbnail": "urn:li:image:{imageId}",
      "title": "Article Title",
      "description": "Article description"
    }
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
```

**Note:** The Posts API does NOT support URL scraping for article posts. You must manually set `thumbnail`, `title`, and `description`. Upload thumbnail via the Images API first to get the `urn:li:image:{id}`.

### Media Upload Flow (for images/videos)
1. Use Images API (`/rest/images`) or Videos API (`/rest/videos`) to register and upload the asset
2. Get back the URN (e.g., `urn:li:image:C49klciosC89`)
3. Reference that URN in the post's `content.media.id` field

---

## 4. Authentication Flow (OAuth 2.0)

### 3-Legged OAuth Flow (for acting on behalf of a user)

**Step 1 — Redirect user to LinkedIn authorization page:**
```
GET https://www.linkedin.com/oauth/v2/authorization
  ?response_type=code
  &client_id={your_client_id}
  &redirect_uri={your_callback_url}
  &state={csrf_token}
  &scope=openid%20profile%20email%20w_member_social
```

**Step 2 — User approves; LinkedIn redirects to your callback with an authorization code:**
```
https://your-app.com/callback?code={auth_code}&state={csrf_token}
```

**Step 3 — Exchange authorization code for access token:**
```
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={auth_code}
&client_id={your_client_id}
&client_secret={your_client_secret}
&redirect_uri={your_callback_url}
```

**Response:**
```json
{
  "access_token": "AQUvlL_DYEzvT2wz...",
  "expires_in": 5184000,
  "refresh_token": "AQX...",
  "refresh_token_expires_in": 31536000,
  "scope": "openid,profile,email,w_member_social"
}
```

### Token Details
- **Access token lifespan:** 60 days (5,184,000 seconds)
- **Refresh tokens:** Available for limited partners only; most apps must re-authorize users
- **Token length:** ~500 characters; plan for up to 1,000

### Key OAuth Endpoints
| Purpose | URL |
|---------|-----|
| Authorization | `https://www.linkedin.com/oauth/v2/authorization` |
| Token Exchange | `https://www.linkedin.com/oauth/v2/accessToken` |
| Token Introspection | `https://www.linkedin.com/oauth/v2/introspectToken` |

---

## 5. Required Permissions / Scopes

### Open Permissions (Self-Service, No Approval Needed)
| Product | Scope | Description |
|---------|-------|-------------|
| Sign In with LinkedIn (OpenID Connect) | `openid`, `profile`, `email` | Basic profile info and email |
| Share on LinkedIn | `w_member_social` | Post, comment, and like on behalf of authenticated member |

### Restricted Permissions (Require Approval)
| Scope | Description | Required Program |
|-------|-------------|------------------|
| `w_organization_social` | Post on behalf of a Company Page | Community Management API (requires app review) |
| `r_organization_social` | Read org posts/comments/likes | Community Management API |
| `r_member_social` | Read member posts/comments/likes | Restricted — approved users only |

### What You Need for Personal Profile Posting
- **Minimum:** `w_member_social` (self-serve, available immediately via "Share on LinkedIn" product)
- **Recommended also:** `openid`, `profile` (to identify the user and get their person URN)

---

## 6. Connection Requests via API

### Invitations API
**Endpoint:** `POST https://api.linkedin.com/v2/invitations`

```json
{
  "invitee": "urn:li:person:{personId}",
  "message": {
    "com.linkedin.invitations.InvitationMessage": {
      "body": "Let's connect!"
    }
  }
}
```

### ⚠️ CRITICAL RESTRICTION
**The Invitations API is restricted to approved partners only.** Access is subject to limitations via API agreement. You cannot use this API without being an approved LinkedIn partner (typically requiring a formal business partnership).

This means **connection requests are NOT available through the standard self-serve API.** There is no way to send connection requests via the official API without partner-level approval.

---

## 7. SDK / Library Recommendations

### Official: `linkedin-api-client` (npm)
- **Package:** `npm install linkedin-api-client`
- **GitHub:** https://github.com/linkedin-developers/linkedin-api-js-client
- **Status:** Beta (last updated March 2023, v0.3.0)
- **Written in:** TypeScript
- **Features:**
  - Full Rest.li method support (GET, CREATE, UPDATE, DELETE, FINDER, etc.)
  - OAuth 2.0 auth client (3-legged and 2-legged)
  - Token generation, exchange, refresh, and introspection
  - Versioned API support
  - Automatic query tunneling
  - Proper parameter encoding
- **Usage example for posting:**
  ```typescript
  import { RestliClient, AuthClient } from 'linkedin-api-client';
  
  const authClient = new AuthClient({
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    redirectUrl: 'https://your-app.com/callback'
  });
  
  // Generate auth URL
  const authUrl = authClient.generateMemberAuthorizationUrl(
    ['openid', 'profile', 'w_member_social'],
    'random_csrf_state'
  );
  
  // After user authorizes, exchange code for token
  const tokenDetails = await authClient.exchangeAuthCodeForAccessToken(code);
  
  // Create a post
  const restliClient = new RestliClient();
  const response = await restliClient.create({
    resourcePath: '/posts',
    entity: {
      author: 'urn:li:person:YOUR_PERSON_ID',
      commentary: 'Hello from the API!',
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    },
    accessToken: tokenDetails.access_token,
    versionString: '202602'
  });
  ```

### Unofficial Libraries
| Library | Description | Risk Level |
|---------|-------------|------------|
| `linkedin-private-api` (npm) | Unofficial NodeJS/TypeScript API using session cookies (no OAuth). Supports messaging, connections, search. | ⛔ HIGH — violates LinkedIn ToS, account ban risk |
| `linkedin-api` (Python, PyPI) | Unofficial Python wrapper, session-cookie based | ⛔ HIGH — same ToS risks |

**Recommendation:** Use the official `linkedin-api-client` npm package. It's the only safe option for production use.

---

## 8. Developer App Requirements & Approval Process

### Step-by-Step Setup
1. **Go to:** https://developer.linkedin.com/
2. **Create a new application** — requires linking to a LinkedIn Company Page
3. **Verify your app** — security verification process
4. **Add Products:**
   - **"Share on LinkedIn"** — self-serve, instant approval → grants `w_member_social`
   - **"Sign In with LinkedIn using OpenID Connect"** — self-serve, instant → grants `openid`, `profile`, `email`
5. **Get credentials:** Client ID and Client Secret from the Auth tab
6. **Set redirect URLs:** Must be absolute HTTPS URLs

### For Company Page Posting (Community Management API)
- Requires a separate **app review process** by LinkedIn
- You must explain your use case clearly
- Reviews can take weeks
- Rejections are common with vague feedback
- Requires a privacy policy, clear value proposition for LinkedIn members

### For Your Use Case (Personal Profile Posting)
**Good news:** You only need:
1. Create a LinkedIn Developer App
2. Add "Share on LinkedIn" product (instant)
3. Add "Sign In with LinkedIn using OpenID Connect" (instant)
4. Implement OAuth 2.0 3-legged flow
5. Use `w_member_social` scope to post as yourself

**No approval process needed** for personal profile posting!

---

## 9. Restrictions & Limitations

### Rate Limits
- LinkedIn uses per-endpoint rate limiting (not a global rate)
- Specific limits are not publicly documented in detail
- Rate limit headers are returned in API responses
- General guideline: be conservative; don't exceed ~100 posts/day

### Platform Restrictions
- **CORS policy:** LinkedIn APIs do NOT support browser-side requests. All API calls must be from a server (Node.js backend)
- **No long-form articles via API:** The "article" content type is a link share, not a LinkedIn native article (the kind with a full editor). Native articles cannot be created via API.
- **Access tokens expire:** 60 days; refresh tokens are only available to select partners
- **Media upload is multi-step:** Register asset → upload binary → reference URN in post
- **API versioning:** You must specify a `Linkedin-Version` header (YYYYMM format) for the Posts API
- **Mentions require URNs:** To mention a user/org, you need their URN and use special syntax: `@[Name](urn:li:person:{id})`
- **Hashtags:** Use `#keyword` in commentary text; returned as template format `{hashtag|\#|keyword}`

### What You CANNOT Do via Standard API
| Action | Available? |
|--------|-----------|
| Post text/image/video to personal profile | ✅ Yes (w_member_social) |
| Post to company page | ⚠️ Requires Community Management API approval |
| Send connection requests | ❌ Restricted to approved partners |
| Send InMail / direct messages | ❌ Restricted to approved partners |
| Search for LinkedIn members | ❌ Not available |
| Scrape profile data | ❌ Not available (and violates ToS) |
| Create native long-form articles | ❌ Not available via API |
| Schedule posts | ❌ No native scheduling; must implement yourself |

---

## 10. Alternatives If Official API Is Too Restrictive

### For Posting Content
The official API with `w_member_social` is sufficient for personal posting. No alternatives needed.

### For Connection Requests / Messaging / Automation
Since the official API restricts these to partners, alternatives exist but carry significant risks:

| Service | Type | Notes |
|---------|------|-------|
| **Unipile** | Third-party API provider ($55+/mo) | Provides connection requests, messaging, data enrichment. Uses LinkedIn session tokens. |
| **Linked API** (linkedapi.io) | Third-party API | Similar to Unipile, connection requests and messaging |
| **Late API** (getlate.dev) | Unified social media API | Abstracts multiple platforms; handles OAuth complexity |
| **PhantomBuster** | Automation platform | Browser automation for LinkedIn actions |
| **linkedin-private-api** (npm) | Unofficial library | Uses session cookies; free but risky |

### ⚠️ WARNING about Unofficial Methods
All unofficial methods (session-cookie APIs, browser automation, third-party proxies) violate LinkedIn's Terms of Service. Risks include:
- **Account restriction or permanent ban**
- **Legal action** (LinkedIn has sued scrapers/automators)
- **Unreliable** — LinkedIn changes internal APIs frequently
- **Security risk** — sharing session cookies with third parties

### Recommended Approach
For your Next.js app:
1. **Posting:** Use the official API with `w_member_social` — it's free, reliable, and fully supported
2. **Connection requests:** Do these manually through LinkedIn's web interface; no safe programmatic option exists
3. **Architecture:** Implement OAuth in your Next.js API routes, store tokens securely, and call the Posts API from server-side code

---

## 11. Quick Implementation Checklist for Next.js

1. [ ] Create LinkedIn Developer App at https://developer.linkedin.com/
2. [ ] Link app to a LinkedIn Company Page (create one if needed)
3. [ ] Add "Share on LinkedIn" product (instant)
4. [ ] Add "Sign In with LinkedIn using OpenID Connect" product (instant)
5. [ ] Note Client ID and Client Secret
6. [ ] Set redirect URL (e.g., `https://your-app.com/api/auth/linkedin/callback`)
7. [ ] Install: `npm install linkedin-api-client`
8. [ ] Implement OAuth flow in Next.js API routes
9. [ ] Store access tokens securely (encrypted in database)
10. [ ] Implement posting via `POST https://api.linkedin.com/rest/posts`
11. [ ] Handle token expiry (60-day lifespan)

---

## Key Reference Links
- **LinkedIn Developer Portal:** https://developer.linkedin.com/
- **Posts API Docs:** https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- **OAuth 2.0 Flow:** https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- **Permissions Overview:** https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- **Official JS Client:** https://github.com/linkedin-developers/linkedin-api-js-client
- **Token Generator Tool:** https://www.linkedin.com/developers/tools/oauth/token-generator
