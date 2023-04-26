const $ = document.querySelector.bind(document);

chimera = {
    init() {
        if (localStorage.getItem("x86-enabled") === "true") {
            const script = document.createElement('script');
            script.src = "https://cheerpxdemos.leaningtech.com/publicdeploy/20230419/cx.js"
            script.onload = async () => {
                let cx = await CheerpXApp.create({ mounts: [{ type: "cheerpOS", dev: "/app", path: "/" }, { type: "cheerpOS", dev: "/app", path: "/app" }, { type: "cheerpOS", dev: "/str", path: "/data" }, { type: "cheerpOS", dev: "/files", path: "/home" }, { type: "cheerpOS", dev: "/files", path: "/tmp" }, { type: "devs", dev: "", path: "/dev" }] });

                chimera.x86 = cx;
            }
            document.head.appendChild(script)

        }

        if (localStorage.getItem("use-expirimental-fs") === "true") {
            const script = document.createElement('script');
            script.src = "/assets/libs/filer.min.js"
            script.onload = () => {
                chimera.fs = new Filer.FileSystem({
                    name: "chimera-mainContext",
                    provider: new Filer.FileSystem.providers.IndexedDB()
                });
                chimera.fs.readFileSync = async (path) => {
                    return await new Promise((resolve, reject) => {
                        return chimera.fs.readFile(path, function async(err, data) {
                            resolve(new TextDecoder('utf8').decode(data))
                        })
                    })
                }
            }
            document.head.appendChild(script)
        }

        // Link to Google Fonts API for some reason (make this not link to external server soon)
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
        document.head.appendChild(link);
    

    },
    fs: undefined,
    syncRead: {

    },
    apps: {},
    Version: "0.1.0 alpha",
    x86fs: {
        async read(path) {
            return await new Promise((resolve, reject) => {
                return cheerpOSGetFileBlob([], "/files/" + path, async (blob) => {
                    resolve(await blob.text())
                })
            })
        },
        write(path, data) {
            cheerpjAddStringFile(`/str/${path}`, data);
            // Depressingly, we can't actually transfer the file to /home without it crashing the users shell //
            // The user must do it themselves //
        }
    },
    async python(appname) {
        return await new Promise((resolve, reject) => {
            let iframe = document.createElement("iframe")
            iframe.style = "display: none"
            iframe.setAttribute("src", "/python.app/lib.html")
            iframe.id = appname
            iframe.onload = async function() {
                console.log("Called from python")
                let pythonInterpreter = await document.getElementById(appname).contentWindow.loadPyodide({
                    stdin: () => {
                        let result = prompt();
                        echo(result);
                        return result;
                    },
                });
                pythonInterpreter.globals.set('AliceWM', AliceWM)
                pythonInterpreter.globals.set('chimera', chimera)
                resolve(pythonInterpreter)
            }
            document.body.appendChild(iframe)
        })
    }




}

chimera.init()
function openBrowser() {
    let dialog = AliceWM.create("AboutBrowser");

    let iframe = document.createElement("iframe")
    iframe.style = "top:0; left:0; bottom:0; right:0; width:100%; height:100%; border:none; margin:0; padding:0;"
    iframe.setAttribute("src", "/browser.html")

    dialog.content.appendChild(iframe)
}
function openVMManager() {
    let dialog = AliceWM.create("Virtual Machine");

    let iframe = document.createElement("iframe")
    iframe.style = "top:0; left:0; bottom:0; right:0; width:100%; height:100%; border:none; margin:0; padding:0;"
    iframe.setAttribute("src", "https://copy.sh/v86")

    dialog.content.appendChild(iframe)
}
function openAppManager() {
    fetch("applicationmanager/launchapp.js")
        .then(response => response.text())
        .then((data) => {
            window.eval(data);
        })
}


async function registerApp(location) {


    let resp = await fetch(`${location}/manifest.json`);
    let manifest = await resp.json()


    let app = {
        name: manifest.name,
        location,
        manifest,
        windowinstance: null,
        async launch() {
            if (manifest.type == 'manual') { // This type of application is discouraged for sure but is the most powerful
                    fetch(`${location}/${manifest.handler}`)
                        .then(response => response.text())
                        .then((data) => {
                            top.window.eval(data);
                            top.window.eval(`loadingScript("${location}")`)
                        })
            } else {
                if (this.windowinstance) return;
                let win = AliceWM.create(this.manifest.wininfo, () => {
                    this.windowinstance = null;
                });

                let iframe = document.createElement("iframe")
                iframe.style = "top:0; left:0; bottom:0; right:0; width:100%; height:100%; border:none; margin:0; padding:0;"
                iframe.setAttribute("src", `${location}/${manifest.index}`);

                win.content.appendChild(iframe);


                this.windowinstance = win;
            }
        },
    };
    let appsContainer = $("#appsView");
    let shortcut = $("#appTemplate").content.cloneNode(true);
    shortcut.querySelector(".app-shortcut-name").innerText = manifest.name;
    if (manifest["icon"]) {
        shortcut.querySelector(".app-shortcut-image").src = `${location}/${manifest["icon"]}`
    }
    shortcut.querySelector(".app-shortcut-image").addEventListener("click", () => {
        app.launch();
    });



    appsContainer.appendChild(shortcut);

    chimera.apps[manifest.package] = app;
    return app;
}

window.addEventListener("load", () => {
    registerApp("browser.app");
    registerApp("term.app");
    registerApp("glxgears.app");
    registerApp("recursion.app");
    registerApp("eruda.app")
});



document.addEventListener("contextmenu", function(e) {
    if (e.shiftKey) return;
    e.preventDefault();

    const menu = document.querySelector(".custom-menu");
    menu.style.removeProperty("display");
    menu.style.top = `${e.clientY}px`;
    menu.style.left = `${e.clientX}px`;
});

document.addEventListener("click", (e) => {
    if (e.button != 0) return;
    document.querySelector(".custom-menu").style.setProperty("display", "none");
});