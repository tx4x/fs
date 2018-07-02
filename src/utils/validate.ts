const prettyPrintTypes = function (types: string[]) {
  const addArticle = (str: string) => {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    if (vowels.indexOf(str[0]) !== -1) {
      return 'an ' + str;
    }
    return 'a ' + str;
  };

  return types.map(addArticle).join(' or ');
};

const isArrayOfNotation = function (typeDefinition: string) {
  return /array of /.test(typeDefinition);
};

const extractTypeFromArrayOfNotation = function (typeDefinition: string) {
  // The notation is e.g. 'array of string'
  return typeDefinition.split(' of ')[1];
};

const isValidTypeDefinition = (typeStr: string): boolean => {
  if (isArrayOfNotation(typeStr)) {
    return isValidTypeDefinition(extractTypeFromArrayOfNotation(typeStr));
  }

  return [
    'string',
    'number',
    'boolean',
    'array',
    'object',
    'buffer',
    'null',
    'undefined',
    'function'
  ].some(function (validType) {
    return validType === typeStr;
  });
};

const detectType = function (value: any | null): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (Buffer.isBuffer(value)) {
    return 'buffer';
  }
  return typeof value;
};

const onlyUniqueValuesInArrayFilter = function (value: string, index: number, self: any) {
  return self.indexOf(value) === index;
};

const detectTypeDeep = (value: any) => {
  let type = detectType(value);
  let typesInArray;

  if (type === 'array') {
    typesInArray = value
      .map((element: any): string => {
        return detectType(element);
      })
      .filter(onlyUniqueValuesInArrayFilter);
    type += ' of ' + typesInArray.join(', ');
  }

  return type;
};

const validateArray = (argumentValue: any, typeToCheck: string): boolean => {
  const allowedTypeInArray = extractTypeFromArrayOfNotation(typeToCheck);
  if (detectType(argumentValue) !== 'array') {
    return false;
  }
  return argumentValue.every(function (element: any) {
    return detectType(element) === allowedTypeInArray;
  });
};

export function validateArgument(methodName: string, argumentName: string, argumentValue: string | any, argumentMustBe: any): boolean {
  const isOneOfAllowedTypes = argumentMustBe.some(function (type: any) {
    if (!isValidTypeDefinition(type)) {
      throw new Error('Unknown type "' + type + '"');
    }

    if (isArrayOfNotation(type)) {
      return validateArray(argumentValue, type);
    }

    return type === detectType(argumentValue);
  });

  if (!isOneOfAllowedTypes) {
    throw new Error('Argument "' + argumentName + '" passed to ' + methodName + ' must be '
      + prettyPrintTypes(argumentMustBe) + '. Received ' + detectTypeDeep(argumentValue));
  }
  return false;
}

export function validateOptions(methodName: string, optionsObjName: string, obj: any, allowedOptions: any) {
  if (obj !== undefined) {
    validateArgument(methodName, optionsObjName, obj, ['object']);
    Object.keys(obj).forEach(function (key) {
      const argName = optionsObjName + '.' + key;
      if (allowedOptions.hasOwnProperty(key)) {
        validateArgument(methodName, argName, obj[key], allowedOptions[key]);
      } else {
        throw new Error('Unknown argument "' + argName + '" passed to ' + methodName);
      }
    });
  }
}
