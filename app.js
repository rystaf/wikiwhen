min = 1880
weight = 50
now = new Date()
var year
var countries = []
var country
var picks = []
var r = 0
document.getElementById("score").value = 0
var domain = "https://upload.wikimedia.org/wikipedia/commons"
var seed = now.getFullYear()*10000 + (now.getMonth()+1)*100 + now.getDate()
var random
getRandom = photos => {
  if (!photos) { return "" }
  i = Math.floor(random()*photos.length)
  member = photos[i]
  source = member?.thumbnail?.source
  console.log("pick", member.title, source)
  if (member.title.slice(0,4) == "File" && !source) {
    return getRandom(photos)    
  }
  return {
    source,
    title: member.title,
    pageid: member.pageid,
    year: year,
    guess: []
  }
}
getPhoto = async (category, once) => {
  console.log("get", category)
  resp = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&generator=categorymembers&formatversion=2&pithumbsize=1000&pilicense=free&gcmtitle=Category%3A${category}&gcmtype=file|subcat&gcmlimit=max`)
  members =  await resp.json()
  pick = getRandom(members?.query?.pages)
  if (pick == "") {
    year = (curYear - Math.floor(random()*(curYear-min)))
    return getPhoto(year + " photographs by country")
  }
  if (/[0-9]{4} photographs by country/.test(category)) {
    console.log("Main")
    countries = members?.query?.pages?.map(x => x?.title?.slice(29)?.replace(/^the /,"")).sort() || []
    country = pick?.title?.slice(29)?.replace(/^the /,"")
  }
  pick.country = country
  if (pick?.title?.slice(0,9) == "Category:") {
    return await getPhoto(pick.title.slice(9))
  }
  return pick
}
grade = photo => {
  p = 1000-Math.abs(photo.year-parseInt(photo.guess[1]))*weight
  if (p<0) { p = 0 }
  if (photo.country == photo.guess[0]) {
    p += 250
  }
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
}
endgame = () => {
  let link = document.createElement("input")
  link.type = "text"
  link.id = "link"
  link.value = `I scored ${score.value} (${Array.from(document.getElementsByTagName("span")).reduce((a, b) => a + b.innerHTML, "").slice(1)}) at ${window.location.origin + window.location.pathname}?s=${seed}`
  let share = document.createElement("input")
  share.value = "Share"
  share.type = "Submit"
  document.getElementById("submit").value = "New"
  share.addEventListener("click", () => {
    if (navigator?.share) {
      navigator.share({ text: link.value })
    } else if (navigator?.clipboard) {
      // Copy the text inside the text field
      navigator.clipboard.writeText(link.value);
      share.value = "Copied"
      share.disabled = true
      setTimeout(() => { share.value = "Share"; share.disabled = false }, 1000)
    }
  })
  if (navigator?.share || navigator?.clipboard) document.body.appendChild(share)
  document.body.appendChild(document.createElement("br"))
  document.body.append(link)
}
getNext = async () => {
  curYear = now.getFullYear()
  var photo
  console.log("next", r)
  if (!picks[r]) {
    year = (curYear - Math.floor(random()*(curYear-min)))
    photo = await getPhoto(year + " photographs by country")
    picks.push(photo)
  } else {
    photo = picks[r]
  }
  photo.round = r+1+"/5"
  let img = document.createElement("figure")
  img.style.backgroundImage = `url(${photo.source}), url(Loading_icon_cropped.gif)`
  document.body.appendChild(img)
  let range = document.createElement("input")
  range.id = "range"
  range.type = "range"
  range.min = min
  range.max = curYear
  range.value = photo.guess[1] || (min+Math.ceil((curYear-min)/2))
  let text = document.createElement("input")
  text.type="number"
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
  selectLabel.appendChild(selectEl)
  div.appendChild(selectLabel)
  document.body.appendChild(div)
  document.body.appendChild(range)
  let round = document.createElement("b")
  round.innerHTML = photo.round
  document.body.appendChild(round)
  let submit = document.createElement("input")
  submit.id = "submit"
  submit.type = "submit"
  if (photo.guess[0]) {
    selectEl.innerHTML = `<option>${photo.guess[0]}</option>`
    selectEl.disabled = true
    grade(photo)
    submit.value = "Next"
  } else {
    selectEl.innerHTML = "<option>Select...</option>"
    submit.value = "Guess"
  }
  if (countries.length == 0 && (!photo.guess || !photo.guess.length)) {
    category = photo.year + " photographs by country"
    resp = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&generator=categorymembers&formatversion=2&pithumbsize=1000&pilicense=free&gcmtitle=Category%3A${category}&gcmtype=file|subcat&gcmlimit=max`)
    members =  await resp.json()
    countries = members?.query?.pages?.map(x => x?.title?.slice(29)?.replace(/^the /,"")).sort() || []
    if (!countries.includes(photo.country)) {
      photo.country = ""
    }
  }
  countries.forEach(x => {
    let option = document.createElement("option")
    option.innerHTML = x
    selectEl.appendChild(option)
  })
  document.body.appendChild(submit)
  submit.addEventListener("click", async (e)=>{
    if (e.target.value == "Guess") {
      photo.guess = [selectEl.value]
      photo.guess.push(range.value)
      range.remove();
      text.disabled = true
      selectEl.disabled = true
      grade(photo)
      document.body.appendChild(submit)
      if (photo.round == "5/5") {
        localStorage.setItem(seed, picks.map(({source,year,country,guess})=>([source.replace(domain,""), year, country, ...guess].join('|'))).join(':'))
        endgame()
      } else {
        submit.value = "Next"
      }
      window.scrollTo(0, document.body.scrollHeight);
    } else if (r == 5) {
      window.location.href = window.location.origin + window.location.pathname + "?s=" + Math.floor(Math.random()*100000)
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
  if (picks[r-1].guess.length == 2){
    document.getElementById("range")?.remove()
    if (r < 5) {
      document.getElementById("submit")?.remove()
      document.body.appendChild(document.createElement("hr"))
      getNext()
    }
    else if (r == 5) {
      endgame()
      window.scrollTo(0, document.body.scrollHeight);
    }
  }
}
if (s = (new URLSearchParams(window.location.search)).get("s")) {
  seed = s
}
random = module.exports(seed)
main = async()=>{
  picks = localStorage.getItem(seed)?.split(':')?.map(x => x.split('|'))
    ?.map(([source, year, country, ...guess]) => ({source: domain+source, year, country, guess})) || []
  console.log(picks)
  //if (picks.length > 0) {
  //  console.log(picks)
  //  pageids = picks.map(x=>parseInt(x.pageid)).join('|')
  //  resp = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&list=&pageids=${pageids}&formatversion=2&pithumbsize=1000&pilicense=free`)
  //  json = await resp.json()
  //  json?.query?.pages.forEach((x,i) => {
  //    p = picks.find(y => y.pageid == x.pageid)
  //    p.source = x?.thumbnail?.source
  //    p.title = x.title
  //  })
  //}

  try { getNext() }
  catch(err) {console.log("error")}
}
main()
