"use strict";
// Unified messaging system types for WebSocket implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType["USER_USER"] = "USER_USER";
    MessageType["ADMIN_CANDIDATE"] = "ADMIN_CANDIDATE";
    MessageType["USER_CANDIDATE"] = "USER_CANDIDATE"; // User-to-candidate messaging system
})(MessageType || (exports.MessageType = MessageType = {}));
//# sourceMappingURL=messaging.js.map