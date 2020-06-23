const opcua = require("./opcua");

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

const nodes_dsp = [
    "номер плавки",
    "температура",
    "б процент расплава",
    "б эрекер 1",
    "б эрекер 2",
    "кислород"
];
const nodes_mnlz = [
    "б ручей 1",
    "б ручей 2",
    "б ручей 3",
    "б ручей 4",
    "б ручей 5",
    "б ручей 6"
]

async function main(endpoint, nodeid) {
    opcua.init();
    await opcua.connect(endpoint);

    // let val = await opcua.read_value(nodeid);
    // console.log('[1] Прочитанное значение = ', val);
    for (let id of nodes_dsp) {
        let path = nodeBase + dsp;
        await opcua.set_subs(path, id, 0)
    }
    for (let id of nodes_mnlz) {
        let path = nodeBase + mnlz;
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
