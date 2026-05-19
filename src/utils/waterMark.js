let watermarkOption = {}

let setWatermarkContent = (content, content2) => {
  let id = '1.23452384164.1223412415';

  if (document.getElementById(id) !== null) {
    document.body.removeChild(document.getElementById(id))
  }

  let cans = document.createElement("canvas")
  cans.width = 200
  cans.height = 130

  let getCanvas = cans.getContext('2d')
  getCanvas.rotate(-20 * Math.PI / 180)
  getCanvas.font = '12px Vedana'
  getCanvas.fillStyle = 'rgba(200, 200, 200, 0.30)'
  getCanvas.textAlign = 'center'
  getCanvas.textBaseline = 'Middle'
  getCanvas.fillText(content, cans.width / 4, cans.height / 2)
  getCanvas.fillText(content2, cans.width / 4, (cans.height / 2) + 20)

  let div = document.createElement('div')
  div.id = id
  div.style.pointerEvents = 'none'
  div.style.top = '0px'
  div.style.left = '0px'
  div.style.position = 'fixed'
  div.style.zIndex = '100000'
  div.style.width = document.documentElement.clientWidth  + 'px'
  div.style.height = document.documentElement.clientHeight  + 'px'
  div.style.background = 'url(' + cans.toDataURL('image/png') + ') left top repeat'
  document.body.appendChild(div)
  return id
}

watermarkOption.set = (content, content2) => {
  let id = setWatermarkContent(content, content2)
  if(document.getElementById(id) === null){
    id=setWatermarkContent(content, content2)
  }
  window.onresize = () => {
    setWatermarkContent(content, content2)
  }
}

export default watermarkOption
