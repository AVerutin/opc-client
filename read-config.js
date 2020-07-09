const cnfFile = require('fs');
const { Pool } = require('pg');
const config = require("config");

const SQLQueries = {
    'AddClass': "INSERT INTO node_classes (class_name) VALUES ($1);",
    'AddObject': "INSERT INTO node_objects (number, name, class) VALUES ($1, $2, $3);",
    'AddParam': "INSERT INTO node_params (node, parameter, value) VALUES ($1, $2, $3);",
    'GetClassID': "SELECT id FROM node_classes WHERE class_name=$1;",
    'GetClassName': "SELECT class_name FROM node_classes WHERE id=$1;",
    'GetObjectID': "SELECT id FROM node_objects WHERE name=$1;",
    'GetObjectName': "SELECT object_name FROM node_objects WHERE id=$1;"
}

const SQLParams = {
    'class_id': 0,
    'class_name': '',
    'object_id': 0,
    'object_name': '',
    'object_number': 0,
    'param_name': '',
    'param_value': ''
}


async function dbConnect () {
    let result = false;
    try {
        dbPool = new Pool(config.get("dbConfig"));
        result = dbPool;
    } catch (err) {
        console.log('Error connectiong to database!');
    } finally {
        return result;
    }
}


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
    // Подключение к базе данных
    const dbPool = await dbConnect();
    if (!dbPool) {
        return false;
    }

    let rollingMill = null;
    // let stanConfig = null;
    // let requestSnapshot = null;
    // let snap = null;
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

    // Удаляем из памяти загруженный конфигурационный файл
    rollingMill = null;

    // Разбираем полученные объекты по типам и сохраняем их в БД
    // Заполним таблицу классов объектов
    let old_names = [];
    let class_names = {}; //TODO: Добавить список всех наименований классов в массив, чтобы не лазить постоянно в базу данных
    for (let obj of objects) {
        let new_name = obj['ИмяКласса'];
        if (!old_names.includes(new_name)) {
            try {
                result = await dbPool.query(SQLQueries.AddClass, [new_name]);
                old_names.push(new_name);
            } catch (err) {
                console.log("DB Error: error additing class name");
                return false;
            }
        }
    }

    // try {
    //     requestSnapshot = cnfFile.readFileSync('./snapshot.json', 'utf8');
    // } catch (err) {
    //     console.log('Ошибка чтения файла конфигурации прокатного стана!\n', err.message);
    // }

    // if (requestSnapshot) {
    //     snap = JSON.parse(requestSnapshot);
    // }

    // console.log(snap.connected);
}


main();
