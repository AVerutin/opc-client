const opcua = require("node-opcua");
const db = require('data-store')({ path: process.cwd() + '/nodes.json' });

const client = opcua.OPCUAClient.create({requestedSessionTimeout: 20000});

const BrowseDirection = {
    Forward: 0,
    Inverse: 1,
    Both: 2,
    Invalid: 3
}

const endpointUrl = "opc.tcp://192.168.11.90:49320";
const nodeId = "ns=2;s=LEVEL.ДСП.б процент расплава";
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
    // the_subscription.on("keepalive",function(){
    //     console.log("keepalive");
    // })
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
        opcua.TimestampsToReturn.Both); // opcua.read_service.TimestampsToReturn.Both = 2
    

    monitoredItem.on("changed",function(dataValue){
        let value = dataValue.value.value;
        console.log("[", node_name, "] => ", value);
        db.set(node_name, value);
        // Обработка полученного значения
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

async function main (endpoint, nodeid) {
    await connect(endpoint);
    let val = await read_value(nodeWrite);
    console.log('[1] Прочитанное значение = ', val);
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