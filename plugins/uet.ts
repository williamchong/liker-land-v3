/**
 * UET (Bing Universal Event Tracking) Plugin
 *
 * Initializes the UET tracking script with:
 * - enableAutoSpaTracking: true - Automatically tracks page views on SPA navigation
 */

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const uetTagId = config.public.uetTagId

  if (!uetTagId) {
    return
  }

  useHead({
    script: [
      {
        innerHTML: `(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${uetTagId}", enableAutoSpaTracking: true};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");`,
      },
    ],
  })
})
