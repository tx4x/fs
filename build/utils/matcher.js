"use strict";
let Minimatch = require('minimatch').Minimatch;
let convertPatternToAbsolutePath = function (basePath, pattern) {
    // All patterns without slash are left as they are, if pattern contain
    // any slash we need to turn it into absolute path.
    let hasSlash = (pattern.indexOf('/') !== -1);
    let isAbsolute = /^!?\//.test(pattern);
    let isNegated = /^!/.test(pattern);
    let separator;
    if (!isAbsolute && hasSlash) {
        // Throw out meaningful characters from the beginning ("!", "./").
        pattern = pattern.replace(/^!/, '').replace(/^\.\//, '');
        if (/\/$/.test(basePath)) {
            separator = '';
        }
        else {
            separator = '/';
        }
        if (isNegated) {
            return '!' + basePath + separator + pattern;
        }
        return basePath + separator + pattern;
    }
    return pattern;
};
function create(basePath, patterns) {
    let matchers;
    if (typeof patterns === 'string') {
        patterns = [patterns];
    }
    matchers = patterns.map(function (pattern) {
        return convertPatternToAbsolutePath(basePath, pattern);
    })
        .map(function (pattern) {
        return new Minimatch(pattern, {
            matchBase: true,
            nocomment: true,
            dot: true
        });
    });
    return function performMatch(absolutePath) {
        let mode = 'matching';
        let weHaveMatch = false;
        let currentMatcher;
        let i;
        for (i = 0; i < matchers.length; i += 1) {
            currentMatcher = matchers[i];
            if (currentMatcher.negate) {
                mode = 'negation';
                if (i === 0) {
                    // There are only negated patterns in the set,
                    // so make everything matching by default and
                    // start to reject stuff.
                    weHaveMatch = true;
                }
            }
            if (mode === 'negation' && weHaveMatch && !currentMatcher.match(absolutePath)) {
                // One negation match is enought to know we can reject this one.
                return false;
            }
            if (mode === 'matching' && !weHaveMatch) {
                weHaveMatch = currentMatcher.match(absolutePath);
            }
        }
        return weHaveMatch;
    };
}
exports.create = create;
;
//# sourceMappingURL=matcher.js.map