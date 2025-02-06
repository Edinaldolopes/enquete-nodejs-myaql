

const mysql = require('mysql2');

const connection =mysql.createConnection(
  {
    host: 'localhost' ,
    user: 'root' ,
     paassword: '' ,
     database: 'meubanco'
   
  }
);

connection.connect(function (err) {
  console.log("conecixao realizada");
});

// Importações necessárias
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

// Configurações do servidor
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Configuração do banco de dados
const sequelize = new Sequelize('meubanco', 'root', 'password', {
  host: 'localhost',
  dialect: 'mysql',
});

// Modelos
const Enquete = sequelize.define('Enquete', {
  titulo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dataInicio: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  dataFim: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

const Opcao = sequelize.define('Opcao', {
  descricao: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  votos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

Enquete.hasMany(Opcao, { as: 'opcoes' });
Opcao.belongsTo(Enquete);

// Rotas CRUD
// Criar uma nova enquete
app.post('/enquetes', async (req, res) => {
  const { titulo, dataInicio, dataFim, opcoes } = req.body;
  try {
    const enquete = await Enquete.create({ titulo, dataInicio, dataFim });
    const opcoesCriadas = await Opcao.bulkCreate(
      opcoes.map((descricao) => ({ descricao, EnqueteId: enquete.id }))
    );
    res.status(201).json({ enquete, opcoes: opcoesCriadas });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar a enquete.' });
  }
});

// Listar todas as enquetes
app.get('/enquetes', async (req, res) => {
  try {
    const enquetes = await Enquete.findAll({ include: 'opcoes' });
    res.json(enquetes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar as enquetes.' });
  }
});

// Atualizar enquete
app.put('/enquetes/:id', async (req, res) => {
  const { id } = req.params;
  const { titulo, dataInicio, dataFim } = req.body;
  try {
    await Enquete.update({ titulo, dataInicio, dataFim }, { where: { id } });
    res.json({ message: 'Enquete atualizada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar a enquete.' });
  }
});

// Excluir enquete
app.delete('/enquetes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Enquete.destroy({ where: { id } });
    res.json({ message: 'Enquete excluída com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir a enquete.' });
  }
});

// Votação
app.post('/votar/:opcaoId', async (req, res) => {
  const { opcaoId } = req.params;
  try {
    const opcao = await Opcao.findByPk(opcaoId);
    if (!opcao) return res.status(404).json({ error: 'Opção não encontrada.' });
    opcao.votos += 1;
    await opcao.save();
    io.emit('nova-votacao', { opcaoId, votos: opcao.votos });
    res.json(opcao);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar o voto.' });
  }
});

// Sincronização e inicialização
sequelize.sync({ force: true }).then(() => {
  console.log('Banco de dados sincronizado.');
  server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});

