const opcua = require("node-opcua");
const { Pool /* , Client */ } = require('pg');

// const dbclient = new Client({
//     user: 'pguser',
//     host: '192.168.56.104',
//     database: 'pguser',
//     password: 'pg_psswrd',
//     port: 5432,
// });

const dbpool = new Pool({
    user: 'pguser',
    host: '192.168.56.104',
    database: 'pguser',
    password: 'pg_psswrd',
    port: 5432,
});

const sqlInsert = "INSERT INTO Nodes (Name, Value) VALUES ($1, $2) RETURNING ID;";
const sqlUpdate = "UPDATE Nodes SET Value = $1 WHERE ID = $2;";
const sqlNodeID = "SELECT ID FROM Nodes WHERE Name = $1;" ;
const sqlLastID = "SELECT last_insert_rowid() AS ID;";
const sqlCreateTable = "CREATE TABLE IF NOT EXISTS Nodes (ID serial PRIMARY KEY, Name TEXT NOT NULL, Value numeric NOT NULL);";

const client = opcua.OPCUAClient.create({requestedSessionTimeout: 20000});

const BrowseDirection = {
    Forward: 0,
    Inverse: 1,
    Both: 2,
    Invalid: 3
}

const endpointUrl = "opc.tcp://192.168.11.90:49320";
const nodeId = "ns=2;s=LEVEL.ДСП.номер плавки";
const DSPID = "ns=2;s=LEVEL.ДСП";
const nodeWrite = "ns=2;s=LEVEL.Сыпучие.Ручной ввод.вес";
const nodeBase = "ns=2;s=";
const loose_dsp = 'LEVEL.Сыпучие.ДСП.';
const loose_naveska1 = 'LEVEL.Сыпучие.Навеска1.';
const loose_naveska2 = 'LEVEL.Сыпучие.Навеска2.';
const loose_pk = 'LEVEL.Сыпучие.ПК.';
const loose_manual_input = 'LEVEL.Сыпучие.Ручной ввод.';
const loose_2 = 'LEVEL.Сыпучие_2.';
const pk = 'LEVEL.ПК.';
const mnlz = 'LEVEL.МНЛЗ.';
const dsp = 'LEVEL.ДСП.';

const ids = [
    // "б ручей 1",
    // "б ручей 2",
    // "б ручей 3",
    // "б ручей 4",
    // "б ручей 5",
    // "б ручей 6",
    "номер плавки",
    "температура",
    "б процент расплава",
    "б эрекер 1",
    "б эрекер 2",
    "кислород"
];

let the_session;

// Подключение к OPC-серверу
async function connect(endpoint)  {
    await client.connect(endpoint);
    the_session = await client.createSession();
}

// Чтение значения ключа
async function read_value(nodeid) {
    let val = await the_session.readVariableValue(nodeid);
    return val.value.value;
}

// Подписка на события
async function set_subs(node_path, node_name, timeout = 0) {
    // Проверить наличие записи в БД с именем node_name
    // если такой записи не существует, то создать и получить ID для вновь созданной записи
    let nodeID = false;
    let result = false;

    try {
        result = await dbpool.query(sqlNodeID, [node_name]);
    } catch (e) {
        console.log('DB Error: ', e);
    }

    if (result.rows.length == 0 ) {
        // Нет записи для текущего узла
        let vals = [node_name, 0];
        try {
            result = await dbpool.query(sqlInsert, vals);
        } catch (e) {
            console.log("DB Error: ", e);
        }
        if (result.rows.length > 0) {
            nodeID = result.rows[0].id;
        }
    } else {
        nodeID = result.rows[0].id;
    }

    // Массив значений наименований ключей
    const nodeid = node_path + node_name;
    the_subscription = opcua.ClientSubscription.create(the_session,{
        requestedPublishingInterval: 500,
        requestedLifetimeCount: 10,
        requestedMaxKeepAliveCount: 5,
        maxNotificationsPerPublish: 10,
        publishingEnabled: true,
        priority: 1
    });

    the_subscription.on("started",function(){
        console.log("subscription started [subscriptionId=", the_subscription.subscriptionId, "]");
    })

    the_subscription.on("terminated",function(){
        console.log("terminated");
        disconnect();
    });

    // Таймер для прекращения подписки и прерывание цикла обработки событий
    if (timeout > 0) {
        setTimeout(function () {
            the_subscription.terminate();
        }, timeout);
    }

    // install monitored item
    let monitoredItem = await the_subscription.monitor(
        {
            nodeId: opcua.resolveNodeId(nodeid),
            attributeId: opcua.AttributeIds.Value
        },
        {
            samplingInterval: 250,
            discardOldest: true,
            queueSize: 1
        },
        opcua.TimestampsToReturn.Both); // opcua.TimestampsToReturn.Both = 2
    

    monitoredItem.on("changed", function(dataValue){
        //FIXME: Изменить запрос на UPDATE
        // сделать объект вида {'name': ID} и искать по имени свойства требуемый ID в базе данных
        // Если ID не найден, значит для этого свойства нет записи в БД
        // Поэтому создать запись в БД, получить сформированный для нее ID и сохранить в объекте (data-store)
        let value = dataValue.value.value;
        let res = 0;
        try {
            res = dbpool.query(sqlUpdate, [value, nodeID]);
        } catch (e) {
            console.log("DB Error: ", e);
        }
        if (res ==0 ) {
            console.log("DB => updated 0 rows!");
        }
        // console.log("[", node_name, "] => ", value);

    });
}


async function browseNode(nodeID) {
    // Получение всех потомков узла
    const nodesToBrowse = [{
        nodeId: nodeID,
        referenceTypeId: "Organizes",
        includeSubtypes: true,
        browseDirection: BrowseDirection.Forward,
        resultMask: 0x3f
    },
    {
        nodeId: nodeID,
        referenceTypeId: "Aggregates",
        includeSubtypes: true,
        browseDirection: BrowseDirection.Forward,
        resultMask: 0x3f
    },
    {
        nodeId: nodeID,
        referenceTypeId: "HasSubtype",
        includeSubtypes: true,
        browseDirection: BrowseDirection.Forward,
        resultMask: 0x3f
    },];
    let results = 0;
    try {
        results = await the_session.browse(nodesToBrowse);
    } catch (e) {
        console.log("Ошибка при просмотре узла: ", e);
    }
    const children = []; // Список ссылок на всех потомков заданного узла

    const res1 = results[0];
    if (res1.references) {
        for (let i = 0; i < res1.references.length; i++) {
            const ref = res1.references[i];
            children.push({
                browseName: ref.browseName.toString(),
                nodeId: ref.nodeId,
                nodeClass: ref.nodeClass,
            });
        }
    }

    const res2 = results[1];
    if (res2.references) {
        for (let i = 0; i < res2.references.length; i++) {
            const ref = res2.references[i];
            children.push({
                browseName: ref.browseName.toString(),
                nodeId: ref.nodeId,
                nodeClass: ref.nodeClass,
            });
        }
    }

    const res3 = results[2];
    if (res3.references) {
        for (let i = 0; i < res3.references.length; i++) {
            const ref = res3.references[i];
            children.push({
                browseName: ref.browseName.toString(),
                nodeId: ref.nodeId,
                nodeClass: ref.nodeClass,
            });
        }
    }

    for (let child of children) {
        console.log(`[${child.browseName}] => Class (${child.nodeClass}) => Path (${child.nodeId.value})`);
    }
}


// Write value on node
async function writeNodeValue(nodeId, dataType, newValue) {
    // var nodeId = "ns=4;s=SetPointTemperature";
    let res = 0;
    var nodesToWrite = [
      {
        nodeId: nodeId,
        attributeId: opcua.AttributeIds.Value,
        value: {                                /*new DataValue(*/
          value: {                              /* Variant */
            dataType: dataType,                 // opcua.DataType.Float
            value: newValue
          }
        }
      }
    ];
  
    try {
        res = await the_session.write(nodesToWrite);
    } catch (e) {
        console.log(e);
    }
    return res;
  }

// close session
async function disconnect() {
    await the_session.close(function(err){
        if(err) {
            console.log("session closed failed ?");
        }
    });
    await client.disconnect();
}

async function createDb() {
    try { 
        await dbpool.query(sqlCreateTable);
    } catch (e) {
        console.log(e);
        return false;
    }
    return true;
}

async function main (endpoint, nodeid) {
    if (!createDb()) {
        console.log('DB connection error!');
        return -1;
    }

    await connect(endpoint);
    // let val = await read_value(nodeId);
    // console.log('[1] Прочитанное значение = ', val);
    for (let id of ids) {
        let path = nodeBase + dsp;
        await set_subs(path, id, 0)
    }
    // let res = await writeNodeValue(nodeWrite, opcua.DataType.Float, 50.0);
    // console.log(res[0].name);
    // val = await read_value(nodeWrite);
    // console.log('[2] Прочитанное значение = ', val);
    // await browseNode(DSPID)

    // await disconnect();
}

main(endpointUrl, nodeId);