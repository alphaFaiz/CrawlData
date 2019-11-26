const puppeteer = require('puppeteer');
var events = require('events');
var mongoose = require('mongoose');
var ProductModel = require('./models/productModel');
events.EventEmitter.defaultMaxListeners = 100;
mongoose.connect("mongodb://admin:kyc%406868@18.138.122.229:27017/?authSource=admin", {
    dbName: 'HuyHoang',
    keepAlive: 1,
    useNewUrlParser: true,
    poolSize: 5,
    useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
var count = 1;
var totalCount = 0;
const getCategories = async (inputLink) => {
    try {
        let browser = await puppeteer.launch()
        // let browser = await puppeteer.launch({headless: false})
        let page = await browser.newPage()
        await page.goto(inputLink, { waitUntil: 'load', timeout: 0 })

        let results = await page.evaluate(() => {
            let childCategoriesSelector = document.querySelectorAll('#catalog_child .item') ? document.querySelectorAll('#catalog_child .item') : undefined;
            let originLink = document.querySelectorAll('.path a')[document.querySelectorAll('.path a').length - 1].getAttribute('href');
            let childCategoriesLinks = [];
            if (childCategoriesSelector) {
                childCategoriesSelector.forEach(category => {
                    childCategoriesLinks.push({
                        title: category.innerText,
                        link: category.querySelector('a').getAttribute('href')
                    });
                });
            }
            // let CategoryImg = document.querySelector('.page_catalog img') ? document.querySelector('.page_catalog img').getAttribute('src') : document.querySelector('.catalog_banner img').getAttribute('src');
            // let CategoryName = document.querySelector('.page_catalog .intro h1') ? document.querySelector('.page_catalog .intro h1').innerText : document.querySelector('.catalog_banner .intro p').innerText;
            // let description = document.querySelector('.page_catalog .content') ? document.querySelector('.page_catalog .content').innerText :
            //     (document.querySelector('.page_catalog .intro div') ? document.querySelector('.page_catalog .intro div').innerText : document.querySelector('.page_catalog .intro span').innerText);
            // return { Name: CategoryName, OriginLink: originLink, Img: CategoryImg, Description: description, ChildCategoriesLinks: childCategoriesLinks }
            return { categoryName: document.querySelectorAll('.path a')[document.querySelectorAll('.path a').length - 1].innerText, OriginLink: originLink, ChildCategoriesLinks: childCategoriesLinks}
        });

        console.log(`_________\n${results.categoryName} có ${results.ChildCategoriesLinks.length} danh mục con.`)
        await browser.close();

        if (results.ChildCategoriesLinks.length == 0) {
            await getProducts(results.OriginLink);
        } else {
            for (let i = 0; i < results.ChildCategoriesLinks.length; i++) {
                await getCategories(results.ChildCategoriesLinks[i].link)
            }
            // results.ChildCategoriesLinks.forEach(async category => {
            //     await getCategories(category.link)
            // })
        }
        // Do what you want with the `results`

    } catch (error) {
        console.log(inputLink);
        console.log(`==GET_CATEGORIES_ERROR==`, error);
    }
}
const getProducts = async (link) => {
    count = 1;
    try {
        let browser2 = await puppeteer.launch();
        let page2 = await browser2.newPage();
        let finalProductList = [];
        await page2.goto(link, { waitUntil: 'load', timeout: 0 });
        let productsResult = await page2.evaluate(() => {
            let maxPage = 1;
            let products = [];
            const createData = () => {
                let productsSelector = document.querySelectorAll('.catalog_plist .box .product');
                productsSelector.forEach(product => {
                    products.push({
                        title: product.querySelector('h3').getAttribute('title'),
                        // productImg: product.querySelector('img').getAttribute('src'),
                        link: product.querySelector('a').getAttribute('href'),
                    })
                });
            }
            if (document.querySelector('.pagination li')) {
                maxPage = document.querySelectorAll('.pagination a')[document.querySelectorAll('.pagination a').length - 2].innerText;
                createData();
                return {categoryName: document.querySelectorAll('.path a')[document.querySelectorAll('.path a').length - 1].innerText, products: products, maxPage: maxPage }
            } else {
                createData();
                return {categoryName: document.querySelectorAll('.path a')[document.querySelectorAll('.path a').length - 1].innerText, products: products, maxPage: maxPage }
            }
            // return products;
        });
        let categoryName = productsResult.categoryName;
        finalProductList.push(...productsResult.products);
        if (productsResult.maxPage > 1) {
            for (let i = 2; i <= productsResult.maxPage; i++) {
                let nextPage = await browser2.newPage();
                nextPage.setDefaultNavigationTimeout(0); 
                await nextPage.goto(link, { waitUntil: 'load', timeout: 0 });
                await nextPage.$eval(`[href="javascript:gotopage(${i})"]`, elem => elem.click());
                await nextPage.waitForNavigation();
                let pagesResult = await nextPage.evaluate(() => {
                    let products = [];
                    let productsSelector = document.querySelectorAll('.catalog_plist .box .product');
                    productsSelector.forEach(product => {
                        products.push({
                            title: product.querySelector('h3').getAttribute('title'),
                            // productImg: product.querySelector('img').getAttribute('src'),
                            link: product.querySelector('a').getAttribute('href'),
                        })
                    });
                    return products;
                });
                // console.log(`PAGE ${i} RESULTS:`, pagesResult.length);
                finalProductList.push(...pagesResult)
            }
        }
        await browser2.close();
        // allProducts.push(...productsResult)
        // console.log('Return:', productsResult);
        console.log(`Tổng số sản phẩm:`, finalProductList.length);
        totalCount += finalProductList.length;
        for (let i = 0; i < finalProductList.length; i++) {
            await getProductInfo(finalProductList[i].link);
        }
    } catch (error) {
        console.log(link);
        console.log(`==GET_PRODUCTS_ERROR==`, error);
    }
}
const getProductInfo = async (link) => {
    try {
        let browser3 = await puppeteer.launch()
        let page3 = await browser3.newPage()
        await page3.goto(link, { waitUntil: 'load', timeout: 0 });
        let productInfo = await page3.evaluate(() => {
            let product = {
                Img: [],
                Slide: 0,
                KeyWork: [],
                SuggestList: [],
                Idproduct: "",
                Name: "",
                Price: 0,
                Cat_id: "",
                Des: "",
                Status: "ACTIVE",
                Color: "",
                Size: null,
            };
            let productSelector = document.querySelector('.pro_info');
            productSelector.querySelectorAll('#slider-thumb a').forEach(image => {
                product.Img.push(image.getAttribute('href'));
            });
            product.Name = productSelector.querySelector('.pro-detail h1').innerText;
            product.KeyWork = [...product.Name.split(' ')];
            product.Idproduct = productSelector.querySelectorAll('.pro-detail ul li span')[1].innerText;
            let generalInfo = productSelector.querySelectorAll('.pro-detail .pro_intro');
            product.Cat_id = document.querySelectorAll('.path a')[document.querySelectorAll('.path a').length - 2].innerText;
            product.Color = generalInfo[0].querySelectorAll('ul li')[1].querySelectorAll('span')[1].innerText;
            product.Price = productSelector.querySelector('.price-txt').innerText;
            product.Des = document.querySelector(`#tinhnang`).innerText;
            return product;
        });
        // console.log(`${count}-Product Detail:`, productInfo);
        console.log(`  + ${count}-${productInfo.Name}`)
        count++;
        await browser3.close();
    } catch (error) {
        console.log(link);
        console.log(`==PRODUCT_INFO_ERROR==`, error);
    }
}
(async () => {
    await
    // getCategories('http://khoahuyhoang.net/san-pham-danh-cho-cua-go/');
    getCategories('http://khoahuyhoang.net/san-pham-danh-cho-cua-go/khoa-tay-nam/');
    // getProducts('http://khoahuyhoang.net/khoa-tay-nam/khoa-tay-nam-huy-hoang-tieu-chuan-chau-au/');
    // getProducts('http://khoahuyhoang.net/khoa-tay-nam-hc/khoa-hc-85/');
    // getProductInfo('http://khoahuyhoang.net/tay-nam-cua-jaguar-pvd-gold/TNCHCJAG-PVDGO.html')
    console.log(`====================\nTổng số sản phẩm đã thêm: ${totalCount} sản phẩm`)
})()