<p align="center">
  <img src="assets/brand/logo-light.webp" alt="StegnoLines Logo" width="360" />
</p>

<p align="center">
    An advanced, zero-trust, client-side steganography and cryptography web application for secure transmission over social media. Combines Brotli compression (WASM), AES-256-CTR encryption with PBKDF2 key derivation, and Unicode Variation Selectors to embed hidden payloads into cover text entirely in the browser.
</p>



## Table of Contents
- [How It Works](#how-it-works)
- [Features](#features)
- [Installation](#installation)
- [Documentation](#documentation)
- [Usage](#usage)
  - [Text embedding (example)](#text-embedding-example)
  - [Text extraction (example)](#text-extraction-example)
- [Contributors](#contributors)
- [License](#license)



## How It Works
StegnoLines hides secret messages inside ordinary-looking text using a three-step, entirely client-side pipeline:

1. **Compression** — The secret message is compressed with Brotli (via a WebAssembly module) to reduce size and increase entropy before encryption.

2. **Encryption** — A symmetric key is derived using PBKDF2 from a user-supplied password and a random salt (the salt can be derived from the cover text). A configurable iteration count hardens the derivation. The resulting 48-byte hash is split: the first 32 bytes are used as the AES-256-CTR key and the remaining 16 bytes are used as the counter (IV).

3. **Embedding** — The encrypted payload is encoded into a bit sequence and embedded into the cover text using Unicode Variation Selectors. A PRNG (seeded appropriately) selects positions inside the cover text where the variation selectors are inserted to carry the hidden bits.

All processing runs entirely in the browser. No message, password, or cover text is sent to a server — you can run the app offline by opening `index.html` or by serving the built files statically.

**Notes and limitations**
- Capacity depends on the length and character set of the cover text; longer and more varied covers allow larger payloads.
- Some platforms normalize, strip, or re-encode text and can remove variation selectors or other invisible characters, which will destroy the payload. Always test your target channel first.
- Use strong, unique passphrases. PBKDF2 mitigates brute force but cannot protect a weak password.







## Features
- **Zero-Trust / Client-side only**: All operations run in the browser — no server communication, no telemetry.
- **Offline-capable**: Can be served statically and used without an internet connection.
- **Scanner**: Paste multiple messages from social media to scan and extract hidden payloads.
- **Image splitting & multi-text embedding**: Embed images into text or split an image across multiple cover texts.
- **Multi-language UI**: Supports English, Arabic, Chinese, French, and Latin scripts.



## Installation
The app runs entirely in the browser. To run locally, clone the repository and open `index.html` in your browser:

```bash
git clone https://github.com/MhmdAly1/StegnoLines.git
```
open StegnoLines/index.html in your browser or serve the folder statically



## Documentation
For a detailed explanation of the project and design decisions, see the documentation site:

[StegnoLines Documentation](https://stegnolines.com/documentation.html)



## Usage

### Text embedding (example)
1. Open the embed page.
2. Enter required fields (secret data, cover text, and Pre-Shared Key(Stego-Key)) then press **Hide data**.
3. Copy the resulting cover text and send it via your chosen social platform.

<p align="center">
  <img src="https://github.com/user-attachments/assets/ce8ece61-1776-450c-847f-97ede384e10e" alt="Embed Example" style="max-width:100%;height:auto;" />
</p>

**Output example:**

<p align="center">
  <img src="https://github.com/user-attachments/assets/6ccd95d2-f6a0-41f5-bb77-3241a39e8e4f" alt="Embed Output" style="max-width:100%;height:auto;" />
</p>

### Text extraction (example)
1. Open the extract page.
2. Paste the received cover text, enter the same Pre-Shared Key(Stego-Key), then press **Extract**.

<p align="center">
  <img src="https://github.com/user-attachments/assets/6190dca3-4684-4234-bd97-e6d3e654b366" alt="Extract Example" style="max-width:100%;height:auto;" />
</p>

**Output example:**

<p align="center">
  <img src="https://github.com/user-attachments/assets/9f3fd5a3-72b6-4108-a509-532460b54c6a" alt="Extract Output" style="max-width:100%;height:auto;" />
</p>

For full usage, examples, and advanced options (image splitting, scanner details), visit: [StegnoLines](https://stegnolines.com)



## Contributors


## License
