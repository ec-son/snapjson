# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.0.0] - Unreleased

### Added

- **Encryption and Decryption**: JSON files can now be encrypted and decrypted
- **Relations Between Collections**: Support for defining and managing relations between collections
- **Command Line Interface (CLI)**: New CLI tool for interacting with the database
- **Document Update Method**: Added update method to Document class

### Fixed

- Various bug fixes and stability improvements

---

## [v1.2.0] - 2023-09-15

### Added

- Auto-creation of collections when they don't exist in the snapjson collection method

### Changed

- Improved overall collection management

### Fixed

- Bug fixes and error corrections

---

## [v1.1.1] - 2023-09-01

### Fixed

- Fixed bugs in query functionality

---

## [v1.1.0] - 2023-08-31

### Added

- **Export Collection Class**: Collection class is now exported for external use
- **DocumentDataType**: Defined DocumentDataType for Document class

### Changed

- `createCollection` method now returns instance of Collection instead of collection name
- Query pagination: Added `offset` property to sort object in QueryOptionType
- Changed `entity` to `property` in query options

### Fixed

- README.md documentation corrections

---

## [v1.0.1] - 2023-08-28

### Fixed

- Corrected README.md file

---

## [v1.0.0] - 2023-08-28

### Added

- Initial release of SnapJSON
- Core database functionality
- Basic document and collection management
- Query system
- Package configuration

---

[v2.0.0]: https://github.com/ec-son/snapjson/tree/v2.0.0
[v1.2.0]: https://github.com/ec-son/snapjson/releases/tag/v1.2.0
[v1.1.1]: https://github.com/ec-son/snapjson/releases/tag/v1.1.1
[v1.1.0]: https://github.com/ec-son/snapjson/releases/tag/v1.1.0
[v1.0.1]: https://github.com/ec-son/snapjson/releases/tag/v1.0.1
[v1.0.0]: https://github.com/ec-son/snapjson/releases/tag/v1.0.0
