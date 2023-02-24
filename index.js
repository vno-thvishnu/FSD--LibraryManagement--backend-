const express = require("express");
const app = express();
const cors = require("cors");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const dotenv = require("dotenv").config();
const URL = process.env.db;
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const EMAIL = process.env.email;
const PASSWORD = process.env.password;

app.use(
  cors({
    // origin: "http://localhost:3000"
    origin: "https://fsd-library-management-frontend.vercel.app",
  })
);
app.use(express.json());

app.post("/admin/register", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const salt = await bcrypt.genSalt(10);
    // $2b$10$5qVBhca30n201BEG7HPTpu
    const hash = await bcrypt.hash(req.body.password, salt);
    // $2b$10$5qVBhca30n201BEG7HPTpu66Jjeq1ONFAYa5/mE.IUc1aezLOsZmi

    req.body.password = hash;

    delete req.body.confirmpassword;

    const adminFinding = await db
      .collection("admins")
      .findOne({ email: req.body.email });

    if (adminFinding) {
      res.json({ message: "Email-id already registered, use another" });
    } else {
      const admin = await db.collection("admins").insertOne(req.body);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL,
          pass: PASSWORD,
        },
      });
      const mailOptions = {
        from: EMAIL,
        to: req.body.email,
        subject: "Account Activated",
        html: `<h3>🙋‍♂️Hi <b>${req.body.name}</b>, your Admin-Account created successfully✨  </h3>
           `,
      };
      transporter.sendMail(mailOptions, function (error, response) {
        if (error) {
          return;
        }
      });
      transporter.close();

      res.json({ message: "Admin Account created successfully" });
    }

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.post("/admin/login", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const admin = await db
      .collection("admins")
      .findOne({ email: req.body.email });

    if (admin) {
      const compare = await bcrypt.compare(req.body.password, admin.password);

      if (compare) {
        res.json({ message: "Admin Login successfully", admin_id: admin._id });
      } else {
        res.json({ message: "email or password incorrect" });
      }
    } else {
      res.json({ message: "email or password incorrect" });
    }
    await connection.close();
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});

app.post("/admin/forgot", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");
    const admin = await db
      .collection("admins")
      .findOne({ email: req.body.email });
    if (admin) {
      var digits = "0123456789";
      let OTP = "";
      for (let i = 0; i < 5; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(OTP, salt);
      const store = await db
        .collection("admins")
        .updateOne({ email: req.body.email }, { $set: { otp: hash } });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL,
          pass: PASSWORD,
        },
      });
      const mailoptions = {
        form: EMAIL,
        to: req.body.email,
        subject: "Admin-Forgot Password",
        html: `<h1>🙋‍♂️Hi ${admin.name}, Your OTP for create new password is ${OTP}. Use recently received OTP
          </h1>`,
      };
      transporter.sendMail(mailoptions, function (error, response) {
        if (error) {
          return;
        }
      });
      transporter.close();

      res.json({ message: "admin_id finded", email: `${req.body.email}` });
    } else {
      res.json({ message: "Account not found in this email-Id" });
    }

    await connection.close();
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
});
app.post("/admin/forgot/otp/:email_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const admin = await db
      .collection("admins")
      .findOne({ email: req.params.email_id });
    if (admin) {
      const compare = await bcrypt.compare(req.body.otp, admin.otp);
      if (compare) {
        res.json({ message: "OTP correct" });
      } else {
        res.json({ message: "OTP incorrect" });
      }
    }

    await connection.close();
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});
app.post("/admin/forgot/otp/new_password/:email_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");
    delete req.body.newpassword;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.confirmpassword, salt);
    req.body.confirmpassword = hash;
    const admin = await db
      .collection("admins")
      .updateOne(
        { email: req.params.email_id },
        { $set: { password: req.body.confirmpassword } }
      );
    const admin2 = await db
      .collection("admins")
      .updateOne({ email: req.params.email_id }, { $set: { otp: "" } });
    res.json({ message: "Admin Password Created Successfully" });
    await connection.close();
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});

app.post("/admin/change", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const admin = await db
      .collection("admins")
      .findOne({ email: req.body.email });
    if (admin) {
      res.json({ message: "admin_id finded", email: `${admin.email}` });
    } else {
      res.json({ message: "Account not found in this email-Id" });
    }

    await connection.close();
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
});
app.put("/admin/change/:email_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const emailFinding = await db
      .collection("admins")
      .findOne({ email: req.params.email_id });

    if (emailFinding) {
      const compare = await bcrypt.compare(
        req.body.currentpassword,
        emailFinding.password
      );

      if (compare) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.confirmpassword, salt);
        req.body.confirmpassword = hash;
        delete req.body.newpassword;

        const admin = await db
          .collection("admins")
          .updateOne(
            { email: req.params.email_id },
            { $set: { password: req.body.confirmpassword } }
          );

        res.json({ message: "Admin Password Changed Successfully" });
      } else {
        res.json({ message: "Current Password Incorrect" });
      }
    } else {
      res.json({ message: "user_id undefined" });
    }

    await connection.close();
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});

app.get("/admin/login_by/:id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const find = await db
      .collection("admins")
      .findOne({ _id: new mongodb.ObjectId(req.params.id) });

    res.json(find);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.post("/add_books", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const find = await db
      .collection("books")
      .findOne({ book_name: req.body.book_name });

    req.body.status = "available";
    req.body.onrack = 0;

    if (find) {
      res.json({ message: "Book name already there, use another" });
    } else {
      const add = await db.collection("books").insertOne(req.body);
      res.json({ message: "Book added successfully" });
    }
    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.get("/view_books", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const books = await db.collection("books").find().toArray();
    res.json(books);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});
app.get("/get_book/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const find = await db
      .collection("books")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });
    res.json(find);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});
app.put("/update_book/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const find = await db
      .collection("books")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });

    delete req.body._id;

    if (find) {
      const update = await db
        .collection("books")
        .updateOne(
          { _id: new mongodb.ObjectId(req.params._id) },
          { $set: req.body }
        );

      res.json({ message: "Changes updated successfully" });
    } else res.json({ message: "book not found" });
    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.delete("/delete_book/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const find = await db
      .collection("books")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });

    if (find) {
      const update = await db
        .collection("books")
        .deleteOne({ _id: new mongodb.ObjectId(req.params._id) });

      res.json({ message: "book deleted successfully" });
    } else res.json({ message: "book not found" });
    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.post("/add_users", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const findemail = await db
      .collection("users")
      .findOne({ email: req.body.email });

    const findno = await db
      .collection("users")
      .findOne({ mobile_no: req.body.mobile_no });

    const findall = await db.collection("users").find().toArray();

    const date = new Date();

    const currentDay =
      date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear();
    const currentTime =
      date.getHours() + "." + date.getMinutes() + "." + date.getSeconds();
    const currentYear = date.getFullYear();
    if (findall.length === 0) {
      req.body.person_id = `${currentYear}0${findall.length + 1}`;
    } else {
      const last = findall[findall.length - 1].person_id;
      const insert = last.slice(5);

      req.body.person_id = `${currentYear}0${parseInt(insert) + 1}`;
    }

    if (findemail && !findno) {
      res.json({ message: "User email already there, use another" });
    } else if (!findemail && findno) {
      res.json({ message: "User mobile number already there, use another" });
    } else if (findemail && findno) {
      res.json({
        message: "User email & mobile number already there, use another",
      });
    } else if (!findemail && !findno) {
      const add = await db.collection("users").insertOne(req.body);
      res.json({ message: "User added successfully" });
    }
    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});
app.get("/view_users", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const users = await db.collection("users").find().toArray();
    res.json(users);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});
app.get("/get_user/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const find = await db
      .collection("users")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });
    res.json(find);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});
app.put("/update_user/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const find = await db
      .collection("users")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });

    delete req.body._id;

    if (find) {
      const update = await db
        .collection("users")
        .updateOne(
          { _id: new mongodb.ObjectId(req.params._id) },
          { $set: req.body }
        );

      res.json({ message: "Changes updated successfully" });
    } else res.json({ message: "user not found" });
    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});
app.delete("/delete_user/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const find = await db
      .collection("users")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });

    if (find) {
      const update = await db
        .collection("users")
        .deleteOne({ _id: new mongodb.ObjectId(req.params._id) });

      res.json({ message: "user deleted successfully" });
    } else res.json({ message: "user not found" });
    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.post("/add_register", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const findbook = await db
      .collection("books")
      .findOne({ book_name: req.body.selected_book });
    const findreg = await db
      .collection("register")
      .find({ person_id: req.body.person_id, reg_status: "borrowed" })
      .toArray();

    const findselectedbook = await db
      .collection("register")
      .findOne({
        person_id: req.body.person_id,
        reg_status: "borrowed",
        selected_book: req.body.selected_book,
      });

    if (findselectedbook) {
      res.json({ message: `already user having ${req.body.selected_book}` });
    } else if (findbook.quantity > 0 && findreg.length < 3) {
      const sub = findbook.quantity - 1;
      const add = findbook.onrack + 1;

      await db
        .collection("books")
        .findOneAndUpdate(
          { book_name: req.body.selected_book },
          { $set: { quantity: sub } }
        );

      if (sub == 0) {
        await db
          .collection("books")
          .findOneAndUpdate(
            { book_name: req.body.selected_book },
            { $set: { status: "not-available" } }
          );
      }
      await db
        .collection("books")
        .findOneAndUpdate(
          { book_name: req.body.selected_book },
          { $set: { onrack: add } }
        );

      const finduser = await db
        .collection("users")
        .findOne({ person_id: req.body.person_id });

      req.body.user_id = finduser._id;
      req.body.reg_status = "borrowed";

      const currentdate = new Date();
      req.body.register_date = currentdate;

      await db.collection("register").insertOne(req.body);

      res.json({ message: "registered successfully" });
    } else if (findbook.quantity == 0) {
      res.json({ message: "book not avaiable" });
    } else if (findreg.length == 3) {
      res.json({ message: "user already borrowed three books" });
    }

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.get("/user/currently_borrowed/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const findreg = await db
      .collection("register")
      .find({
        user_id: new mongodb.ObjectId(req.params._id),
        reg_status: "borrowed",
      })
      .toArray();
    res.json(findreg);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.get("/get_register/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const findreg = await db
      .collection("register")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });
    res.json(findreg);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.put("/edit_register/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const avoid = await db
      .collection("books")
      .findOne({ book_name: req.body.selected_book });

    const findonereg = await db
      .collection("register")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });

    if (
      avoid.quantity !== 0 ||
      req.body.selected_book === findonereg.selected_book
    ) {
      await db
        .collection("register")
        .findOneAndUpdate(
          { _id: new mongodb.ObjectId(req.params._id) },
          { $set: { selected_book: "", reg_status: "" } }
        );

      const findonebook = await db
        .collection("books")
        .findOne({ book_name: findonereg.selected_book });

      const adding = findonebook.quantity + 1;
      const subing = findonebook.onrack - 1;
      if (adding === 1) {
        await db
          .collection("books")
          .findOneAndUpdate(
            { book_name: findonereg.selected_book },
            { $set: { status: "available" } }
          );
      }
      await db
        .collection("books")
        .findOneAndUpdate(
          { book_name: findonereg.selected_book },
          { $set: { quantity: adding } }
        );
      await db
        .collection("books")
        .findOneAndUpdate(
          { book_name: findonereg.selected_book },
          { $set: { onrack: subing } }
        );
    }
    const findbook = await db
      .collection("books")
      .findOne({ book_name: req.body.selected_book });
    const findreg = await db
      .collection("register")
      .find({ person_id: findonereg.person_id, reg_status: "borrowed" })
      .toArray();

    const findselectedbook = await db
      .collection("register")
      .findOne({
        person_id: findonereg.person_id,
        reg_status: "borrowed",
        selected_book: req.body.selected_book,
      });

    if (findselectedbook) {
      res.json({ message: `already user having ${req.body.selected_book}` });
    } else if (findbook.quantity > 0 && findreg.length < 3) {
      const sub = findbook.quantity - 1;
      const add = findbook.onrack + 1;

      await db
        .collection("books")
        .findOneAndUpdate(
          { book_name: req.body.selected_book },
          { $set: { quantity: sub } }
        );

      if (sub == 0) {
        await db
          .collection("books")
          .findOneAndUpdate(
            { book_name: req.body.selected_book },
            { $set: { status: "not-available" } }
          );
      }
      await db
        .collection("books")
        .findOneAndUpdate(
          { book_name: req.body.selected_book },
          { $set: { onrack: add } }
        );

      await db
        .collection("register")
        .findOneAndUpdate(
          { _id: new mongodb.ObjectId(req.params._id) },
          {
            $set: {
              selected_book: req.body.selected_book,
              reg_status: "borrowed",
              return_date: req.body.return_date,
            },
          }
        );

      res.json({ message: "registered successfully" });
    } else if (findbook.quantity == 0) {
      res.json({ message: "book not avaiable" });
    } else if (findreg.length == 3) {
      res.json({ message: "user already borrowed three books" });
    }

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.delete("/delete_register/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const findonereg = await db
      .collection("register")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });

    const findonebook = await db
      .collection("books")
      .findOne({ book_name: findonereg.selected_book });

    const adding = findonebook.quantity + 1;
    const subing = findonebook.onrack - 1;
    if (adding === 1) {
      await db
        .collection("books")
        .findOneAndUpdate(
          { book_name: findonereg.selected_book },
          { $set: { status: "available" } }
        );
    }
    await db
      .collection("books")
      .findOneAndUpdate(
        { book_name: findonereg.selected_book },
        { $set: { quantity: adding, onrack: subing } }
      );

    if (findonereg && findonebook) {
      await db
        .collection("register")
        .deleteOne({ _id: new mongodb.ObjectId(req.params._id) });

      res.json({ message: "register deleted successfully" });
    } else res.json({ message: "book not found" });

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.put("/book_returned/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const findonereg = await db
      .collection("register")
      .findOne({ _id: new mongodb.ObjectId(req.params._id) });

    const findonebook = await db
      .collection("books")
      .findOne({ book_name: findonereg.selected_book });

    const adding = findonebook.quantity + 1;
    const subing = findonebook.onrack - 1;
    if (adding === 1) {
      await db
        .collection("books")
        .findOneAndUpdate(
          { book_name: findonereg.selected_book },
          { $set: { status: "available" } }
        );
    }
    await db
      .collection("books")
      .findOneAndUpdate(
        { book_name: findonereg.selected_book },
        { $set: { quantity: adding, onrack: subing } }
      );

    if (findonereg && findonebook) {
      await db
        .collection("register")
        .findOneAndUpdate(
          { _id: new mongodb.ObjectId(req.params._id) },
          { $set: { reg_status: "returned" } }
        );

      res.json({ message: "book returned successfully" });
    } else res.json({ message: "book not found" });

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.get("/user/pastly_borrowed/:_id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const findreg = await db
      .collection("register")
      .find({
        user_id: new mongodb.ObjectId(req.params._id),
        reg_status: "returned",
      })
      .toArray();
    res.json(findreg);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.get("/view_registers", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const users = await db.collection("register").find().toArray();
    res.json(users);

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.get("/display_counts", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("library_management");

    const users = await db
      .collection("register")
      .find({ reg_status: "borrowed" })
      .toArray();
    const ids = users.map((user) => {
      return user.user_id.toString();
    });
    const removeDuplicates = (ids) => {
      return [...new Set(ids)];
    };

    const due = users.map((user) => {
      const currentdate = new Date();
      const returndate = new Date(user.return_date);

      const fnd = returndate.getTime() - currentdate.getTime();
      const d = Math.round(fnd / (24 * 60 * 60 * 1000));
      const days = d;
      if (days < 0) {
        return user.return_date;
      }
    });
    const finddue = due.filter((item) => item !== undefined);

    const today = users.map((user) => {
      const currentdate = new Date();
      const returndate = new Date(user.return_date);

      const fnd = returndate.getTime() - currentdate.getTime();
      const d = Math.round(fnd / (24 * 60 * 60 * 1000));
      const days = d;
      if (days === 0) {
        return user.return_date;
      }
    });
    const findtoday = today.filter((item) => item !== undefined);

    const books = await db.collection("books").find().toArray();
    const qnty_rack = books.map((books) => {
      return books.quantity + books.onrack;
    });
    const sum = qnty_rack.reduce(function (x, y) {
      return x + y;
    }, 0);

    res.json({
      userborrowed: removeDuplicates(ids).length,
      totalbooksborrowed: users.length,
      duebooks: finddue.length,
      todayreturns: findtoday.length,
      totalbooks: sum,
    });

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.listen(process.env.PORT || 7002);
