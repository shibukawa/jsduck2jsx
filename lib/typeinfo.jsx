import "console.jsx";
import "js/nodejs.jsx";

class Rule
{
    var skip : boolean;
    var params : Map.<string[]>; // for method param. [param, ret]
    var type : string;           // for property or method return value
    var skips : string[];        // skip parameter convination for class
    var omitOverride : boolean;
    var extras: string[];
}

class TypeInfo
{
    /**
     * sample:
     * {
     *     special: {
     *         "Ext.Array#sort": {
     *             "skip" : true,
     *             "type" : "boolean",
     *             "skips" : ["iterable : NodeList, fn : (Object, Number, Array) -> void"]
     *         },
     *     },
     *     common: {
     *         "Boolean": "boolean"
     *     }
     * }
     */
    var commonRule : Map.<string>;
    var specialRule : Map.<Rule>;
    var extraItems : variant[];
    var used : Map.<string>;
    var ignoreKey : string;

    function constructor (filepath : string)
    {
        this.commonRule = {
            'String': 'string',
            'String[]': 'string[]',
            'Object': 'variant',
            'Object[]': 'variant[]',
            'Number': 'number',
            'Number[]': 'number[]',
            'Boolean': 'boolean',
            'Array': 'variant[]',
            'Function': 'function () : void',
            'null': 'void',
            '*': 'variant'
        };
        this.specialRule = {} : Map.<Rule>;
        this.extraItems = [] : variant[];
        this.used = {} : Map.<string>;
        if (filepath)
        {
            var json = JSON.parse(node.fs.readFileSync(filepath, 'utf8'));
            if (json['common'])
            {
                var commonRule = json['common'] as Map.<string>;
                for (var key in commonRule)
                {
                    if (commonRule.hasOwnProperty(key))
                    {
                        this.commonRule[key] = commonRule[key];
                    }
                }
            }
            if (json['special'])
            {
                var specialRule = json['special'] as Map.<Rule>;
                for (var key in specialRule)
                {
                    if (specialRule.hasOwnProperty(key))
                    {
                        this.specialRule[key] = specialRule[key];
                    }
                }
            }
            if (json['extra'])
            {
                this.extraItems = json['extra'] as variant[];
            }
        }
    }

    function searchAltNames(json : variant) : void
    {
        if (json["alternateClassNames"])
        {
            var altNames = json["alternateClassNames"] as string[];
            var originalName = json["name"] as string;
            for (var i = 0; i < altNames.length; i++)
            {
                this.commonRule[altNames[i]] = originalName;
                this.commonRule[altNames[i] + '[]'] = originalName + '[]';
            }
        }
    }

    function convertProperty (parent : string, member : string, type : string) : Nullable.<string>
    {
        var rule = this.specialRule[parent + '#' + member];
        if (rule)
        {
            if (rule.skip)
            {
                return null;
            }
            if (rule.type)
            {
                type = rule.type;
            }
        }
        else if (type.indexOf('/') != -1)
        {
            type = 'variant';
        }
        else
        {
            type = this.convertType(type, parent + "#" + member);
        }
        return type;
    }

    function convertType(type : string, source : string) : string
    {
        if (this.commonRule[type] != null)
        {
            type = this.commonRule[type];
        }
        this.checkUsedFlag(type, source);
        return type;
    }

    function convertMethod (ruleKey : string, member : string, params : string[][], ret : string, definitions : string[], internalNames : string[], isStatic : boolean) : void
    {
        var convertedParams = [] : string[];
        var types = [] : string[];
        var reservedNames = {
            "class": true,
            "return": true,
            "this": true,
            "new": true
        };
        for (var i = 0; i < params.length; i++)
        {
            var convertedType = this.convertType(params[i][1], ruleKey);
            if (!convertedType)
            {
                return;
            }
            var name = params[i][0];
            if (reservedNames[name])
            {
                name = name + '_';
            }
            convertedParams.push([name, convertedType].join(' : '));
            types.push(convertedType);
        }
        var key = convertedParams.join(', ');
        var rule = this.specialRule[ruleKey];
        if (ret.indexOf('/') != -1 || ret.indexOf('|') != -1)
        {
            ret = 'variant';
        }
        if (rule)
        {
            if (rule.extras)
            {
                for (var i = 0; i < rule.extras.length; i++)
                {
                    definitions.push(rule.extras[i]);
                }
            }
            if (rule.skip || rule.skips && rule.skips.indexOf(key) != -1)
            {
                return;
            }
            if (rule.params && rule.params.hasOwnProperty(key))
            {
                if (!rule.params[key])
                {
                    return;
                }
                if (rule.params[key][1])
                {
                    ret = rule.params[key][1];
                    key = rule.params[key][0];
                }
                else if (rule.type)
                {
                    ret = rule.type;
                    key = rule.params[key][0];
                }
                else
                {
                    ret = this.convertType(ret, ruleKey);
                    key = rule.params[key][0];
                }
            }
            else if (rule.type)
            {
                ret = rule.type;
            }
        }
        else
        {
            var internalName = (isStatic ? 'static:' : '') + (member as string) + '(' + types.join(',') + ')';
            if (internalNames.indexOf(internalName) != -1)
            {
                return;
            }
        }
        // it is used to check duplication, override detection
        var internalName = (isStatic ? 'static:' : '') + (member as string) + '(' + types.join(',') + ')';
        internalNames.push(internalName);
        ret = this.convertType(ret, ruleKey);
        var result : string[];
        if (member == 'constructor')
        {
            result = ['function ', member, ' (', key, ')'];
        }
        else if (member)
        {
            result = ['function ', member, ' (', key, ') : ', ret];
        }
        else
        {
            result = ['function  (', key, ') : ', ret];
        }
        if (isStatic)
        {
            result.unshift('static ');
        }
        definitions.push(result.join(''));
    }

    function checkUsedFlag(name : string, key : string) : void
    {
        if (name != this.ignoreKey)
        {
            this.used[name] = key;
        }
    }

    function omitOverride(classname : string, method : string, key : string) : boolean
    {
        var rule = this.specialRule[classname + '#' + method];
        if (rule && rule.omitOverride)
        {
            return true;
        }
        return false;
    }
}
