import { render } from 'preact';
import { useState } from 'preact/hooks';
import * as HighCharts from 'highcharts'
import { HighchartsReact } from 'highcharts-react-official';


interface PositionInfo {
  side: 'long' | 'short'
  type: ['call', number] | ['put', number] | 'future'
  price: number
  qty: number
}

type Positions = { id: number, position: PositionInfo }[];

let positionId = 1;
const initialPositions: Positions = [
  { id: 0, position: { side: 'long', type: ['call', 100.00], price: 1.00, qty: 1 }}
]

const defaultCall: PositionInfo = {
  side: 'long',
  type: ['call', 100.00],
  price: 1.0,
  qty: 1
};

const defaultPut: PositionInfo = {
  side: 'long',
  type: ['put', 100.00],
  price: 1.0,
  qty: 1
};

const defaultFuture: PositionInfo = {
  side: 'long',
  type: 'future',
  price: 100,
  qty: 1
};

function Position({position: { side, type, price, qty }, onRemovePosition, onModifyPosition} : { position: PositionInfo, onRemovePosition: () => void, onModifyPosition: (pos: PositionInfo) => void }) {
  const [editMode, setEditMode] = useState(false);
  const [editSide, setEditSide] = useState(side);
  const [editStrike, setEditStrike] = useState(type != 'future' ? type[1] : undefined);
  const [editQty, setEditQty] = useState(qty);
  const [editPrice, setEditPrice] = useState(price);
  const sideHTML =
    editMode ? 
      <button style={{ backgroundColor: editSide == 'long' ? 'red' : 'blue', borderColor: editSide == 'long' ? 'red' : 'blue', padding: "0px" }} onClick={() => {setEditSide(editSide == 'long' ? 'short' : 'long')}}>{editSide == 'long' ? "매수" : "매도"}</button>
    :
      side == 'long'
      ? <span style={{ color: 'red'  }}>매수</span>
      : <span style={{ color: 'blue' }}>매도</span>;
  const typeHTML =
    type == 'future'
    ? <span>선물</span>
    : type[0] == 'call'
      ? <span>콜 {editMode ? <input type="text" inputmode="decimal" pattern="(\d)*(\.\d+)?" value={editStrike} onChange={(ev) => { setEditStrike(parseFloat((ev.target as HTMLInputElement).value)) }} /> : type[1].toFixed(2)}</span>
      : <span>풋 {editMode ? <input type="text" inputmode="decimal" pattern="(\d)*(\.\d+)?" value={editStrike} onChange={(ev) => { setEditStrike(parseFloat((ev.target as HTMLInputElement).value)) }} /> : type[1].toFixed(2)}</span>;
  return <div class="position">
    <div class="position-header">
      {typeHTML}
      <span>{sideHTML} {editMode ? <input type="text" inputmode="numeric" pattern="(\d)*" value={editQty} onChange={(ev) => { setEditQty(Math.floor(parseFloat((ev.target as HTMLInputElement).value))) }} />  : qty} 계약</span>
      <span>평균가 {editMode ?  <input type="text" inputmode="decimal" pattern="(\d)*" value={editPrice} onChange={(ev) => { setEditPrice(parseFloat((ev.target as HTMLInputElement).value)) }} /> : price.toFixed(2)}</span>
    </div>
    <div class="position-btn vbtn-group">
      <button onClick={() => {if (editMode) onModifyPosition({ side: editSide, type: type == 'future' ? 'future' : [type[0], editStrike!], qty: editQty, price: editPrice }); setEditMode(!editMode);}}>{editMode ? "완료" : "수정"}</button>
      <button onClick={onRemovePosition}>X</button>
    </div>
  </div>;
}

function PositionBuilder({positions, onAddPosition, onRemovePosition, onModifyPosition} :
    {positions: Positions, onAddPosition: (pos: PositionInfo) => void, onRemovePosition: (id: number) => void, onModifyPosition: (id: number, pos: PositionInfo) => void}) {
  return <div id="position-builder">
    <h1 style={{ textAlign: 'center' }}>포지션 빌더</h1>
    <div class="btn-group" id="add-position-group" role="group">
      <button onClick={() => { onAddPosition(defaultCall) }}>콜</button>
      <button onClick={() => { onAddPosition(defaultPut) }}>풋</button>
      <button onClick={() => { onAddPosition(defaultFuture) }}>선물</button>
    </div>
    {
      positions.map(({id, position}) =>
        <Position position={position} onRemovePosition={() => { onRemovePosition(id) }} onModifyPosition={(pos) => {onModifyPosition(id, pos)}} />)
    }
  </div>;
}

function PnLGraph({positions} : {positions: Positions}) {
  const [cur, setCur] = useState(100);
  const [range, setRange] = useState(5);

  const rs100 = Math.floor(cur * (100 - range));
  const re100 = Math.floor(cur * (100 + range));

  const nx = (x: number, y: number) => isNaN(x) ? y : x;
  let expData = []
  for (let i = rs100; i <= re100; ++i) {
    const curPrice = i / 100;
    const sum = positions.reduce((left, cur) => {
      const pos = cur.position
      if (pos.type == 'future') {
        const pnl = (curPrice - pos.price) * pos.qty;
        return left + (pos.side == 'long' ? pnl : -pnl);
      }
      else if (pos.type[0] == 'call') {
        const strike = pos.type[1];
        const pnl = (Math.max(curPrice - strike, 0) - pos.price) * pos.qty;
        return left + (pos.side == 'long' ? pnl : -pnl);
      }
      else {
        const strike = pos.type[1];
        const pnl = (Math.max(strike - curPrice, 0) - pos.price) * pos.qty;
        return left + (pos.side == 'long' ? pnl : -pnl);
      }
    }, 0);
    expData.push({ x: curPrice, y: sum });
  }
  const options: HighCharts.Options = {
    title: {
      text: "손익"
    },
    tooltip: {
      valueDecimals: 2
    },
    series: [{
      type: 'line',
      data: expData,
      color: 'red',
      negativeColor: 'blue',
    }]
  }
  return <div id="pnl">
    <label for="graphCenter"><b>현재가</b>:</label>
    <input type="text" inputMode="decimal" pattern="(\d)*(\.\d+)?" value={cur.toFixed(2)} onChange={ev => setCur(nx(parseFloat((ev.target as HTMLInputElement).value), 100)) }></input>
    <br />
    <label for="graphRange"><b>범위</b>: {range.toFixed(2)}%</label>
    <input type="range" min="0.1" max="50" step="0.01" value={range} class="slider" name="graphRange" onInput={ev => { setRange(parseFloat((ev.target as HTMLInputElement).value)) }}></input>
    <HighchartsReact
      highcharts={HighCharts} 
      options={options}/>
  </div>
}

function App() {
  const [positions, setPositions] = useState<Positions>(initialPositions);
  return <div class="flex-container">
    <PositionBuilder
      positions={positions}
      onAddPosition={(pos) => setPositions([...positions, { id: positionId++, position: pos }])}
      onRemovePosition={(id) => setPositions(positions.filter(({id: oid}) => id != oid))}
      onModifyPosition={(id, pos) => setPositions(positions.map(({id: oid, position}) => { if (id == oid) return {id, position: pos}; else return {id: oid, position}; }))} />
    <PnLGraph positions={positions} />
  </div>;
}

render(<App />, document.getElementById("app")!);
