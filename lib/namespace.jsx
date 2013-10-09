import "console.jsx";
import "classinfo.jsx";
import "typeinfo.jsx";

class Namespace implements Dumpable {
    var name : string;
    var fqname : string;
    var childSpaces : Map.<Namespace>;
    var classInfo : ClassInfo;

    function constructor(fqname : string = '', name : string = '')
    {
        this.fqname = fqname;
        this.name = name;
        this.childSpaces = {} : Map.<Namespace>;
    }

    function defineClass(classObj : ClassInfo) : Namespace
    {
        if (classObj.name == '')
        {
            throw new Error("class doesn't have name");
        }
        return this._defineClass([], classObj.name.split('.'), classObj);
    }

    function _defineClass(nameParts : string[], remainedNameParts : string[], classObj : ClassInfo) : Namespace
    {
        var result : Namespace;
        if (remainedNameParts.length == 0)
        {
            if (!this.classInfo && classObj)
            {
                this.classInfo = classObj;
            }
            result = this;
        }
        else
        {
            var namespace = remainedNameParts.shift();
            nameParts.push(namespace);
            if (!this.childSpaces[namespace])
            {
                this.childSpaces[namespace] = new Namespace(nameParts.join('.'), namespace);
            }
            result = this.childSpaces[namespace]._defineClass(nameParts, remainedNameParts, classObj);
        }
        return result;
    }

    function getBaseClasses (global : Namespace) : ClassInfo[]
    {
        var result = [] : ClassInfo[];
        var target = this.classInfo;
        while (target.baseclass)
        {
            var names = target.baseclass.split('.');
            var currentSpace = global;
            var notFound = false;
            for (var i = 0; i < names.length; i++)
            {
                var nextSpace = currentSpace.childSpaces[names[i]];
                if (!nextSpace)
                {
                    notFound = true;
                    break;
                }
                currentSpace = nextSpace;
            }
            if (notFound)
            {
                break;
            }
            target = currentSpace.classInfo;
            if (target)
            {
                result.push(target);
            }
            else
            {
                break;
            }
        }
        return result;
    }

    function _sortName (obj : variant, callback : (string) -> void) : void
    {
        this._sortName(obj, (key : string, isLast : boolean) -> {
            callback(key);
        });
    }

    function _sortName (obj : variant, callback : (string, boolean) -> void) : void
    {
        var keys = [] : string[];
        var map = obj as Map.<variant>;
        for (var key in map)
        {
            if (map.hasOwnProperty(key))
            {
                keys.push(key);
            }
        }
        keys.sort();
        for (var i = 0; i < keys.length; i++)
        {
            callback(keys[i], i == (keys.length - 1));
        }
    }

    function write(result : string[], typeinfo : TypeInfo, global : Namespace = null) : void
    {
        if (!global)
        {
            global = this;
        }
        var indent = this.fqname.split('.').length;
        if (this.classInfo)
        {
            if (!this.classInfo.isExpose)
            {
                if (!typeinfo.used[this.classInfo.name])
                {
                    console.log(this.classInfo.name, "is omitted");
                    return;
                }
                console.log(this.classInfo.name, "is private, but used from", typeinfo.used[this.classInfo.name]);
            }
            this.classInfo.dump(result, this.getBaseClasses(global));
        }
        else if (this.fqname != '')
        {
            var line = ['class ', this.fqname.split('.')[indent - 1]];
            if (indent == 1)
            {
                line.unshift('native ');
            }
            result.push(this._indent(indent - 1, line.join('')));
            result.push(this._indent(indent - 1, '{'));
        }
        this._sortName(this.childSpaces, (name) -> {
            result.push('');
            this.childSpaces[name].write(result, typeinfo, global);
        });
        if (this.classInfo)
        {
            this.classInfo.dumpCloseParen(result);
        }
        else if (this.fqname != '')
        {
            if (indent == 1)
            {
                result.push(this._indent(indent - 1, '} = """' + this.fqname + ';""";'));
            }
            else
            {
                result.push(this._indent(indent - 1, '}'));
            }
        }
    }
}
