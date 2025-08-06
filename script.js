document.addEventListener("DOMContentLoaded", function () {
    const givebutterScript = document.createElement("script");
    givebutterScript.src = "https://widgets.givebutter.com/latest.umd.cjs?acct=rfuBvOJ14QTerl5N&p=other";
    givebutterScript.async = true;
    document.head.appendChild(givebutterScript);
});

document.getElementById('toggleSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('expanded');
});
function togglePanel(name) {
    closeAllPanels();
    document.getElementById(`panel-${name}`).classList.remove('hidden');
}
function closePanel(name) {
    document.getElementById(`panel-${name}`).classList.add('hidden');
}
function closeAllPanels() {
    document.querySelectorAll('.info-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('detail-panel').classList.add('hidden');
}
function openDetail(title, offset) {
    const panel = document.getElementById('detail-panel');
    document.getElementById('detail-title').innerText = title;
    document.getElementById('detail-content').innerText = `Placeholder content for ${title}.`;
    panel.dataset.offset = offset;
    panel.classList.remove('hidden');
}
function closeDetail() {
    document.getElementById('detail-panel').classList.add('hidden');
}