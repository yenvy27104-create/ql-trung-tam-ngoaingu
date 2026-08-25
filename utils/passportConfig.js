/**
 * ============================================================================
 * TIỆN ÍCH CẤU HÌNH PASSPORT GOOGLE OAUTH
 * ============================================================================
 * Khởi tạo chiến lược Google Strategy phụ trợ cho Passport.
 * Tự động tạo hồ sơ học viên mới nếu tài khoản Google chưa từng đăng nhập.
 */

const passport = require('passport');
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const User=require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "auth/google/callback"
},
async (accessToken, refreshToken, Profiler, done) => {
    try{
        const email=Profiler.emails[0].value;
        let user=await User.getByEmail(email);

        if (user) {
            return done(null,user);
        } else{
            const newUserData={
                HoTen:Profiler.displayName,
                Email:email,
                SoDienThoai:'',
                MatKhau:Math.random().toString(36).slice(-10)
            };
            const newUserId=await User.createStudent(newUserData);
            user=await User.getById(newUserId);
            return done(null,user);
        }
    }catch(error){
        return done(error,null);
        }
    }
));
passport.serializeUser((user,done)=>{
    done(null,user.MaNguoiDung);
});
passport.deserializeUser(async(id,done)=>{
    try{
        const user=await User.getById(id);
        done(null,user);
    }catch(err){
        done(err,null);
    }
});
module.exports=passport