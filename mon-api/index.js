import express from "express"

const app = express()
app.use(express.json())

let users = [
  { id: 1, nom: "Ada" },
  { id: 2, nom: "Linus" },
]

// liste
app.get("/users", (req, res) => {
  res.json(users)
})

// un seul
app.get("/users/:id", (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id))
  if (!user) return res.status(404).json({ error: "introuvable" })
  res.json(user)
})

// créer
app.post("/users", (req, res) => {
  const user = { id: Date.now(), nom: req.body.nom }
  users.push(user)
  res.status(201).json(user)
})

// modifier
app.put("/users/:id", (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id))
  if (!user) return res.status(404).json({ error: "introuvable" })
  user.nom = req.body.nom
  res.json(user)
})

// supprimer
app.delete("/users/:id", (req, res) => {
  users = users.filter(u => u.id !== Number(req.params.id))
  res.status(204).end()
})

app.listen(3000)