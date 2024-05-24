const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
const crypto = require('crypto');
const { type } = require('os');



const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        avatar: {
            type: String,
            // default: '',
        },
        dateOfBirth: {
            type: Date,
            default: new Date('2000-01-01'),
        },
        gender: {
            type: Boolean,
            default: false,
        },
        phoneBooks: {
            type: [{ name: String, phone: String }],
            default: [],
        },
        role: {
            type: String,
            enum: [0, 1],
            default: 0,
        },
        // accessToken: { type: String, require: true },
        refreshToken: { type: String},
        passwordChangedAt:{
            type: String,
        },
        passwordResetWToken:{
            type: String,
        },
        passwordResetExpires:{
            type: String,
        },
        registerToken:{
            type: String,
        },
        isBlocked: {
            type: Boolean,
            default: false
        },
        keywords: {
            type: [String],
            index: true
        },
        friendList: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
    },
    { timestamps: true },
);

userSchema.pre('save', async function(next){
    // Kiểm tra xem trường 'name' có tồn tại không
    if(this.name) {
        // Tạo keywords từ 'name' và gán chúng cho trường 'keywords'
        this.keywords = generateKeywords(this.name);
    }
    if(!this.isModified('password')){
        next()
    }
    const salt = bcrypt.genSaltSync(10)
    this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods = {
    isCorrectPassword: async function(password){
        return await bcrypt.compare(password, this.password)
    },
    createPasswordChangeToken: function(){
        const resetToken = crypto.randomBytes(32).toString('hex')
        this.passwordResetWToken = crypto.createHash('sha256').update(resetToken).digest('hex')
        this.passwordResetExpires = Date.now() + 15 * 60 *1000
        return resetToken
    }
}
// tao keywords cho displayName, su dung cho search
const generateKeywords = (displayName) => {
    // liet ke tat cac hoan vi. vd: name = ["David", "Van", "Teo"]
    // => ["David", "Van", "Teo"], ["David", "Teo", "Van"], ["Teo", "David", "Van"],...
    const name = displayName.split(' ').filter((word) => word);
  
    const length = name.length;
    let flagArray = [];
    let result = [];
    let stringArray = [];
  
    /**
     * khoi tao mang flag false
     * dung de danh dau xem gia tri
     * tai vi tri nay da duoc su dung
     * hay chua
     **/
    for (let i = 0; i < length; i++) {
      flagArray[i] = false;
    }
  
    const createKeywords = (name) => {
      const arrName = [];
      let curName = '';
      name.split('').forEach((letter) => {
        curName += letter;
        arrName.push(curName);
      });
      return arrName;
    };
  
    function findPermutation(k) {
      for (let i = 0; i < length; i++) {
        if (!flagArray[i]) {
          flagArray[i] = true;
          result[k] = name[i];
  
          if (k === length - 1) {
            stringArray.push(result.join(' '));
          }
  
          findPermutation(k + 1);
          flagArray[i] = false;
        }
      }
    }
  
    findPermutation(0);
  
    const keywords = stringArray.reduce((acc, cur) => {
      const words = createKeywords(cur);
      return [...acc, ...words];
    }, []);
  
    return keywords;
  };
module.exports = mongoose.model('User', userSchema);



