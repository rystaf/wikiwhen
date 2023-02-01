min = 1880
weight = 50
now = (new Date()).getFullYear()
var year
var countries = []
var country
var picks = []
var r = 0
document.getElementById("score").value = 0
getRandom = photos => {
  if (!photos) { return "" }
  i = Math.floor(Math.random()*photos.length)
  member = photos[i]
  console.log("pick", member.title)
  source = member?.thumbnail?.source
  if (member.title.slice(0,4) == "File" && !source) {
    return getRandom(photos)    
  }
  return {
    source,
    title: member.title,
    pageid: member.pageid,
    year: year
  }
}
getPhoto = async (category, once) => {
  console.log("get", category)
  resp = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&generator=categorymembers&formatversion=2&pithumbsize=1000&pilicense=free&gcmtitle=Category%3A${category}&gcmtype=file|subcat&gcmlimit=max`)
  members =  await resp.json()
  pick = getRandom(members?.query?.pages)
  if (/[0-9]{4} photographs by country/.test(category)) {
    console.log("Main")
    countries = members?.query?.pages?.map(x => x?.title?.slice(29)?.replace(/^the /,"")).sort()
    country = pick?.title?.slice(29)?.replace(/^the /,"")
  }
  pick.country = country
  if (pick?.title?.slice(0,9) == "Category:") {
    return await getPhoto(pick.title.slice(9))
  }
  return pick
}
getNext = async () => {
  year = (now - Math.floor(Math.random()*(now-min)))
  var photo
  if (!picks[r]) {
    photo = await getPhoto(year + " photographs by country")
    picks.push(photo)
  } else {
    photo = picks[r]
  }
  console.log(photo)
  photo.round = r+1+"/5"
  let img = document.createElement("figure")
  img.style.backgroundImage = `url(${photo.source})`
  document.body.appendChild(img)
  let range = document.createElement("input")
  range.type = "range"
  range.min = min
  range.max = now
  range.value = (min+Math.ceil((now-min)/2))
  let text = document.createElement("input")
  text.type="text"
  text.value=range.value
  let textLabel = document.createElement("label")
  textLabel.innerHTML = "Year:"
  textLabel.appendChild(text)
  let div = document.createElement("div")
  div.appendChild(textLabel)
  let selectLabel = document.createElement("label")
  selectLabel.innerHTML = "Country:"
  
  range.addEventListener("input", (e)=>text.value=e.target.value)
  text.addEventListener("input", (e)=>range.value=e.target.value)
  let selectEl = document.createElement("select")
  selectEl.innerHTML = "<option>Select...</option>"
  if (countries.length == 0) {
    category = photo.year + " photographs by country"
    resp = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&generator=categorymembers&formatversion=2&pithumbsize=1000&pilicense=free&gcmtitle=Category%3A${category}&gcmtype=file|subcat&gcmlimit=max`)
    members =  await resp.json()
    countries = members?.query?.pages?.map(x => x?.title?.slice(29)?.replace(/^the /,"")).sort()
  }
  countries.forEach(x => {
    let option = document.createElement("option")
    option.innerHTML = x
    selectEl.appendChild(option)
  })
  selectLabel.appendChild(selectEl)
  div.appendChild(selectLabel)
  document.body.appendChild(div)
  document.body.appendChild(range)
  let submit = document.createElement("input")
  let round = document.createElement("b")
  round.innerHTML = photo.round
  document.body.appendChild(round)
  submit.type = "submit"
  submit.value = "Guess"
  document.body.appendChild(submit)
  submit.addEventListener("click", async (e)=>{
    if (e.target.value == "Guess") {
      p = 1000-Math.abs(photo.year-parseInt(range.value))*weight
      if (p<0) { p = 0 }
      if (photo.country == selectEl.value) {
        p += 250
      }
      range.remove();
      text.disabled = true
      selectEl.disabled = true
      let answer = document.createElement("a")
      answer.href = `https://commons.wikimedia.org/wiki/${photo.title}`
      answer.target = "_blank"
      answer.innerHTML = `${photo.year} ${photo.country}`
      let points = document.createElement("span")

      points.innerHTML = "+"+p
      score = document.getElementById("score")
      score.value = (parseInt(score.value)+p)
      document.body.appendChild(answer)
      document.body.appendChild(points)
      document.body.appendChild(document.createElement("br"))
      document.body.appendChild(submit)
      if (photo.round == "5/5") {
            submit.value= "New"
            let link = document.createElement("input")
            link.type = "text"
            link.id = "link"
            link.value = window.location.origin + window.location.pathname
            link.value+="?p="
            link.value+=btoa(picks.map(x => [x.pageid,x.country,x.year].join('.')).join('-')) 
            let share = document.createElement("input")
            share.value = "Share"
            share.type = "Submit"
            share.addEventListener("click", ()=>navigator.share({
              title: "Wiki When",
              text: `I scored ${score.value} at ${document.getElementById("link").value}`,
              url: document.getElementById("link").value
            }))
            if (navigator.share) {
              document.body.appendChild(share)
            }
            document.body.appendChild(document.createElement("br"))
            document.body.append(link)
      } else {
        submit.value= "Next"
      }

      window.scrollTo(0, document.body.scrollHeight);
    } else if (r == 5) {
      window.location.href=window.location.origin+window.location.pathname
    } else if (submit.value != "New") {
      submit.disabled = true;
      document.body.appendChild(document.createElement("hr"))
      try {
        await getNext()
        submit.remove()
      } catch {
        console.log('catch')
        setTimeout(()=>{
          submit.disabled = false
        }, 2000)
      }
    }
  })
  window.scrollTo(0, document.body.scrollHeight);
  r += 1
  countries = []
}
if (p = (new URLSearchParams(window.location.search)).get("p")) {
  picks = atob(p)
    .split('-')
    .map(x => x.split('.'))
    .map(([pageid, country, year]) => ({pageid, country, year}))
}
main = async()=>{
  if (picks.length > 0) {
    console.log(picks)
    pageids = picks.map(x=>parseInt(x.pageid)).join('|')
    resp = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&list=&pageids=${pageids}&formatversion=2&pithumbsize=1000&pilicense=free`)
    json = await resp.json()
    json?.query?.pages.forEach((x,i) => {
      p = picks.find(y => y.pageid == x.pageid)
      p.source = x?.thumbnail?.source
      p.title = x.title
    })
  }

  try { getNext() }
  catch(err) {console.log("error")}
}
main()
