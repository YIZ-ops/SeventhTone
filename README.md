**Prerequisites:** Node.js 22.12.0


1. Install dependencies:
   `npm install -D @tailwindcss/vite`
   `npm install`
2. Run the app:
   `npm run dev`

# capacitor 打包
npm install @capacitor/core @capacitor/cli
npx cap init MyApp com.example.myapp
npm install @capacitor/android 

构建 Web 项目：npm run build
添加平台：npx cap add android
同步资源：npx cap sync android 
运行与调试：npx cap open android

每次修改 Web 代码后需重新
npm run build
npx cap sync android 
rerun androidstudio app

Docs：
1. api
   https://github.com/meetDeveloper/freeDictionaryAPI
   https://xxapi.cn/doc/englishwords
   https://free-api.com/

2. capacitor
   https://capacitor.xuxo.top/docs/plugins/community

3. llm
   https://cloud.siliconflow.cn/me/models