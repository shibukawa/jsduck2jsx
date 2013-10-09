import "console.jsx";
import "typeinfo.jsx";

mixin Dumpable
{
    function _indent(indent : int, content : string) : string
    {
        var line = [] : string[];
        for (var i = 0; i < indent; i++) { line.push('    '); }
        line.push(content);
        return line.join('');
    }
}

abstract class Member implements Dumpable
{
    var name : string;
    var isExpose : boolean;
    var isStatic : boolean;

    function constructor(parentname : string, json : variant)
    {
        var privateFlag = json['private'] as boolean;
        var deprecated = json['deprecated'] as boolean;
        var isStatic = json['static'] as boolean;
        var definedHere = parentname == (json['owner'] as string);
        // static methods are not inherited!
        if ((isStatic && !privateFlag && !deprecated) ||  (!isStatic && definedHere && !privateFlag && !deprecated))
        {
            this.isExpose = true;

            this.name = json['name'] as string;
            this.isStatic = isStatic;
        }
        else
        {
            this.isExpose = false;
        }
    }

    abstract function dump(result : string[], indent : int) : void;
}

class Param
{
    var name : string;
    var types : string[];
    var optional : boolean;
    var variable : boolean;

    function constructor (json : variant, className : string, typeinfo : TypeInfo, info : string)
    {
        this.optional = json['optional'] as boolean;
        this.variable = false;
        this.name = json['name'] as string;
        var types = [] : string[];
        var srctype = json['type'] as string;
        if (srctype.slice(-5) == '|null')
        {
            srctype = 'Nullable.<' + typeinfo.convertType(srctype.slice(0, -5), className) + '>';
        }
        if (srctype.slice(-10) == '/undefined')
        {
            srctype = 'Nullable.<' + typeinfo.convertType(srctype.slice(0, -10), className) + '>';
        }
        var typeSrcs = srctype.split(/[\/\|]/g);
        for (var i = 0; i < typeSrcs.length; i ++)
        {
            if (typeSrcs[i] == 'Function')
            {
                types = types.concat(Method.parseMethod(json, typeinfo, className, info + '/' + this.name, null));
            }
            else
            {
                var type = typeSrcs[i];
                if (type.indexOf('...') != -1)
                {
                    this.variable = true;
                    type = type.replace(/\.\.\./g, '');
                }
                types.push(typeinfo.convertType(type, className));
            }
        }
        this.types = [] : string[];
        for (var i = 0; i < types.length; i++)
        {
            if (this.types.indexOf(types[i]) == -1)
            {
                this.types.push(types[i]);
            }
        }
    }
}

class Method extends Member
{
    var definitions : string[];

    static function parseMethod(json : variant, typeinfo : TypeInfo, className : string, typeInfoKey : string, methodName : Nullable.<string>) : string[]
    {
        var srcParams = [] : Param[];
        var ret = 'void';
        if (json['params'])
        {
            var paramJson = json['params'] as variant[]; 
            for (var i = 0; i < paramJson.length; i++)
            {
                srcParams.push(new Param(paramJson[i], className, typeinfo, typeInfoKey));
            }
        }
        if (json['chainable'])
        {
            ret = className;
        }
        else if (json['return'])
        {
            ret = typeinfo.convertType(json['return']['type'] as string, typeInfoKey);
        }

        // cteate convination
        var params = [] : string[][][];
        params.push([] : string[][]);
        for (var i = 0; i < srcParams.length; i++)
        {
            var newParams = [] : string[][][];
            var param = srcParams[i];
            for (var j = 0; j < params.length; j++)
            {
                for (var k = 0; k < param.types.length; k++)
                {
                    var newParamEntry = params[j].slice(0);
                    newParamEntry.push([param.name, param.types[k]]);
                    newParams.push(newParamEntry);
                }
                if (param.optional)
                {
                    newParams.push(params[j].slice(0));
                }
            }
            params = newParams;
        }
        var definitions = [] : string[];
        var existingMethods = {} : Map.<boolean>;
        for (var i = 0; i < params.length; i++)
        {
            var methodDef = typeinfo.convertMethod(typeInfoKey, methodName, params[i], ret, existingMethods);
            if (methodDef)
            {
                definitions.push(methodDef);
            }
        }
        return definitions;
    }

    function constructor(parentname : string, json : variant, typeinfo : TypeInfo)
    {
        super(parentname, json);
        
        if (this.isExpose)
        {
            this.definitions = Method.parseMethod(json, typeinfo, parentname, parentname + '#' + this.name, this.name);
        }
    }

    override function dump(result : string[], indent : int) : void
    {
        for (var i = 0; i < this.definitions.length; i++)
        {
            var content = [this.definitions[i]] : string[];
            if (this.isStatic)
            {
                content.unshift('static ');
            }
            result.push(this._indent(indent, content.join('') + ';'));
        }
    }
}

class Property extends Member
{
    var type : string;
    function constructor(parentname : string, json : variant, typeinfo : TypeInfo)
    {
        super(parentname, json);
        if (this.isExpose)
        {
            var typeString = (json['type'] as string).replace(/\|/g, '/');
            var type = typeinfo.convertProperty(parentname, this.name, typeString);
            if (!type)
            {
                this.isExpose = false;
            }
            else
            {
                this.type = type;
            }
        }
    }

    override function dump(result : string[], indent : int) : void
    {
        var line = [] : string[];
        if (this.isStatic)
        {
            line.push('static ');
        }
        line.push('var ', this.name, ' : ', this.type, ';');
        result.push(this._indent(indent, line.join('')));
    }
}


class ClassInfo implements Dumpable
{
    var name : string;
    var baseclass : Nullable.<string>;
    var methods: Method[];
    var properties: Property[];
    var isExpose : boolean;
    var singleton : boolean;

    function constructor(json : variant, typeinfo : TypeInfo)
    {
        var privateFlag = json['private'] as boolean;
        var deprecated = json['deprecated'] as boolean;
        this.isExpose = (!privateFlag && !deprecated);
        this.name = json['name'] as string;
        typeinfo.ignoreKey = this.name;
        this.singleton = json['singleton'] as boolean;
        if (typeof json['extends'] == 'string')
        {
            this.baseclass = typeinfo.convertType(json['extends'] as string, this.name);
        }
        else
        {
            this.baseclass = null;
        }
        this.methods = [] : Method[];
        this.properties = [] : Property[];

        var members : variant[];

        // The latest JSDuck's output 
        if (json['statics'])
        {
            var instancemethods = json['members']['method'] as variant[];
            var staticmethods = json['statics']['method'] as variant[];
            var instanceproperties = json['members']['property'] as variant[];
            var staticproperties = json['statics']['property'] as variant[];
            members = staticmethods.concat(instancemethods).concat(staticproperties).concat(instanceproperties);
        }
        // Ext.js 4.2.1 bundled document
        else
        {
            members = json['members'] as variant[];
        }

        for (var i = 0; i < members.length; i++)
        {
            var member = members[i];
            var tagname = member['tagname'] as string;
            switch (tagname)
            {
            case 'method':
                var method = new Method(this.name, member, typeinfo);
                if (method.isExpose)
                {
                    this.methods.push(method);
                }
                if (this.singleton)
                {
                    method.isStatic = true;
                }
                break;
            case 'property':
                var property = new Property(this.name, member, typeinfo);
                if (property.isExpose)
                {
                    this.properties.push(property);
                }
                if (this.singleton)
                {
                    property.isStatic = true;
                }
                break;
            case 'cfg':
                break;
            }
        }
    }

    function dump(result : string[]) : void
    {
        var indent = this.name.split('.').length;
        var line = ['class ', this.name.split('.')[indent - 1]] : string[];
        if (indent == 1)
        {
            line.unshift('native ');
        }
        if (this.baseclass)
        {
            line.push(' extends ', this.baseclass);
        }
        result.push(this._indent(indent - 1, line.join('')));
        result.push(this._indent(indent - 1, '{'));
        for (var i = 0; i < this.properties.length; i++)
        {
            this.properties[i].dump(result, indent);
        }
        if (this.properties.length > 0)
        {
            result.push('');
        }
        for (var i = 0; i < this.methods.length; i++)
        {
            this.methods[i].dump(result, indent);
        }
    }

    function dumpCloseParen(result : string[]) : void
    {
        var indent = this.name.split('.').length;
        if (indent == 1)
        {
            result.push(this._indent(indent - 1, '} = """' + this.name + ';""";'));
        }
        else
        {
            result.push(this._indent(indent - 1, '}'));
        }
    }
}