"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tree_walker_1 = require("./utils/tree_walker");
const interfaces_1 = require("./interfaces");
const matcher_1 = require("./utils/matcher");
function async(from, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options && !options.filter) {
            if (options.matching) {
                options.filter = matcher_1.create(from, options.matching);
            }
            else {
                options.filter = () => { return true; };
            }
        }
        const collector = function () {
            const stream = this;
            const item = stream.read();
            if (!item) {
                return;
            }
            if (options.filter(item.path)) {
                nodes.push({
                    path: item.path,
                    item: item.item,
                    status: interfaces_1.ENodeOperationStatus.COLLECTED
                });
            }
        };
        let nodes = [];
        return new Promise((resolve, reject) => {
            // start digging
            tree_walker_1.stream(from, {
                inspectOptions: {
                    mode: true,
                    times: true,
                    checksum: 'md5',
                    symlinks: options ? options.flags & interfaces_1.EBaseFlags.FOLLOW_SYMLINKS ? false : true : true
                }
            }).on('readable', function () { return collector.apply(this, arguments); })
                .on('error', reject)
                .on('end', () => {
                resolve(nodes);
            });
        });
    });
}
exports.async = async;
//# sourceMappingURL=iterator.js.map