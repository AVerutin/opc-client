const opcua = require("./opcua");
const nodeList = require('data-store')({ path: process.cwd() + '/NodesList.json' });

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

const Nodes = [];

async function main(endpoint, nodeid) {

    let sensors = {};

    for (let i = 1; i < 9; ++i) {
        let sensor_name = 'Sensor ' + i;
        let template = {}
        // template[sensor_name] = {};
        template.ID = i;
        template.Place = 'LEVEL.Сыпучие.Навеска1';
        template.Name = 'вес' + i;
        sensors[sensor_name] = template;
    }
    nodeList.set('Sensors', sensors);
    


    opcua.init();
    await opcua.connect(endpoint);

    // let val = await opcua.read_value(nodeid);
    // console.log('[1] Прочитанное значение = ', val);
    for (let id of nodes_dsp) {
        let path = nodeBase + dsp;
        await opcua.set_subs(path, id, 0)
    }


    // let res = await opcua.writeNodeValue(nodeWrite, opcua.dataType.Float, 30.0);
    // console.log(res[0].name);
    // val = await opcua.read_value(nodeWrite);
    // console.log('[2] Прочитанное значение = ', val);
    // await opcua.browseNode(DSPID)

    // await opcua.disconnect();


}

main (endpointUrl, nodeId);
