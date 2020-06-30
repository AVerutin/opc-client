const cnfFile = require('fs');
// const snapshot = require('data-store')({ path: process.cwd() + '/snapshot.json' });

function analizeString(message) {
    let msg = message.trim();
    let result = {
        'Type': '',
        'Value': '',
        'Param': ''
    };

    if (msg.length > 0) {
        if (msg.startsWith('//')) {
            // Строка начинается с символов комментария
            result.Type = 'Comment';
            result.Value = msg.slice(2);
        } else if (msg.startsWith('(')) {
            // Строка начинается с открывающей скобки
            result.Type = 'ObjectStart';
            result.Value = '';
        } else if (msg.startsWith(')')) {
            // Строка начинается с закрывающей скобки
            result.Type = 'ObjectEnd';
            result.Value = '';
        } else if (msg.includes('=')) {
            // Строка начинается с буквы, но содержит знак =
            // Это значение параметра
            let eqPos = msg.indexOf('=');
            result.Type = 'Parameter';
            result.Param = msg.slice(0, eqPos);
            result.Value = msg.slice(eqPos+1);
        } else {
            // Строка начинается с буквы и не содержит знак =
            // это тип класса
            result.Type = 'Class';
            result.Value = msg;
        }
    }

    return result;
};

async function main() {
    //FIXME: Необходимо организовать возможность каскадного вложения объектов один в другой более чем 1 уровень

    let rollingMill = null;
    // let stanConfig = null;
    let requestSnapshot = null;
    let snap = null;
    const objects = [];
    let object = {};
    let subObject = {};

    let className = '';
    let startClass = false;
    let startSubClass = false;
    let subClassName = '';

    try {
        rollingMill = cnfFile.readFileSync('./RollingMillConfig.txt').toString().split("\n");
    } catch (err) {
        console.log('Ошибка чтения файла конфигурации прокатного стана!\n', err.message);
    }

    for (let i = 0; i < rollingMill.length; ++i) {
        let res = (analizeString(rollingMill[i]));
        let msg = false;
        if (res.Type == '') continue;

        if (res.Type == 'Class') {
            if (startClass) {
                // Класс уже был открыт, обрабатываем вложенный класс
                subClassName = res.Value;
                msg = `[Подкласс] => ${subClassName}`;
            } else {
                // Открываем класс
                className = res.Value;
                msg = `[Класс] => ${className}`;
            }
        } else 

        if (res.Type == 'Parameter') {
            // Параметр класса
            if (startSubClass) {
                // Открыт вложенный класс, сохраняем параметр в него
                subObject[res.Param] = res.Value;
            } else {
                // Сохраняем параметр в класс
                object[res.Param] = res.Value;
            }
        } else 

        if (res.Type == 'Comment') {
            msg = `[Комментарий] = ${res.Value}`;
        } else 

        if (res.Type == 'ObjectStart') {
            // msg = 'CLASS BEGIN';
            if (startClass) {
                // Класс уже открыт, открываем вложенный клас
                startSubClass = true;
                subObject = {};
                subObject['ИмяКласса'] = subClassName;
            } else {
                // Открываем класс
                startClass = true;
                object = {};
                object['ИмяКласса'] = className;
            }
        } else 

        if (res.Type == 'ObjectEnd') {
            // msg = 'CLASS END';
            if (startSubClass) {
                // Открыт вложенный клас, закрывем его
                object[subClassName] = subObject;
                startSubClass = false;
                subClassName = '';
            } else {
                // Закрываем класс
                objects.push(object);
                startClass = false;
                className = '';
            }
        }

        if (msg) {
            console.log(msg);
        }
    }

    // Разбирать второй конфигурационный файл не имеет смысла, т.к.они полностью идентичные
    rollingMill = null;

    try {
        requestSnapshot = cnfFile.readFileSync('./snapshot.json', 'utf8');
    } catch (err) {
        console.log('Ошибка чтения файла конфигурации прокатного стана!\n', err.message);
    }

    if (requestSnapshot) {
        snap = JSON.parse(requestSnapshot);
    }

    console.log(snap.connected);
}


main();
